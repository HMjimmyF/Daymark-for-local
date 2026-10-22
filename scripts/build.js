const fs = require('node:fs')
const path = require('node:path')
const rspack = require('@rspack/core')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
process.env.NODE_ENV = 'production'

function assertSafeOutput(target) {
    const resolved = path.resolve(target)
    if (resolved !== path.join(root, 'dist')) {
        throw new Error('Refusing to clean an unexpected output directory')
    }
}

function runCompiler(config) {
    return new Promise((resolve, reject) => {
        const compiler = rspack(config)
        compiler.run((error, stats) => {
            compiler.close(() => {
                if (error) {
                    reject(error)
                    return
                }
                if (stats.hasErrors()) {
                    reject(new Error(stats.toString({ colors: false, errors: true })))
                    return
                }
                resolve(stats)
            })
        })
    })
}

async function main() {
    assertSafeOutput(dist)
    fs.rmSync(dist, { recursive: true, force: true })

    const configs = [require('../configs/rspack/main.config'), require('../configs/rspack/preload.config'), require('../configs/rspack/renderer.config')]

    for (const config of configs) {
        const stats = await runCompiler(config)
        process.stdout.write(`${stats.toString({ colors: false, chunks: false, modules: false })}\n`)
    }

    const required = ['main/index.js', 'preload/index.js', 'renderer/index.html']
    for (const relative of required) {
        if (!fs.existsSync(path.join(dist, relative))) {
            throw new Error(`Missing build artifact: ${relative}`)
        }
    }

    const rendererHtml = fs.readFileSync(path.join(dist, 'renderer/index.html'), 'utf8')
    if (!rendererHtml.includes('assets/')) {
        throw new Error('Renderer bundle was not linked into index.html')
    }

    console.log('Daymark production build completed.')
}

main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
})
