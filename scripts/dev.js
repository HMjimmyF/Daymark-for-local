const path = require('node:path')
const { spawn } = require('node:child_process')
const rspack = require('@rspack/core')
const { RspackDevServer } = require('@rspack/dev-server')
const electron = require('electron')

const root = path.resolve(__dirname, '..')
const rendererUrl = 'http://127.0.0.1:5173'
let electronProcess = null
let restarting = false
let stopping = false
let devServer
const watchers = []

function waitForRenderer() {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now()
        const poll = async () => {
            try {
                const response = await fetch(rendererUrl)
                if (response.ok) {
                    resolve()
                    return
                }
            } catch {
                // The dev server has not started listening yet.
            }
            if (Date.now() - startedAt > 25_000) {
                reject(new Error('Renderer dev server did not become ready within 25 seconds'))
                return
            }
            setTimeout(poll, 150)
        }
        poll()
    })
}

function startElectron() {
    if (stopping) {
        return
    }
    const electronArguments = ['.']
    if (process.env.DAYMARK_DEV_DATA_DIR) {
        electronArguments.push(`--daymark-data-dir=${path.resolve(process.env.DAYMARK_DEV_DATA_DIR)}`)
    }
    if (process.env.DAYMARK_DEV_REMOTE_DEBUG_PORT) {
        electronArguments.push(`--remote-debugging-port=${process.env.DAYMARK_DEV_REMOTE_DEBUG_PORT}`)
    }

    electronProcess = spawn(electron, electronArguments, {
        cwd: root,
        stdio: 'inherit',
        env: {
            ...process.env,
            DAYMARK_DEV_URL: rendererUrl
        }
    })
    electronProcess.on('exit', (code) => {
        if (!restarting && !stopping) {
            console.log(`Electron exited with code ${code ?? 0}. Stopping development session.`)
            stopAll(code ?? 0)
        }
    })
}

function stopElectron() {
    if (!electronProcess || electronProcess.killed) {
        return Promise.resolve()
    }
    return new Promise((resolve) => {
        electronProcess.once('exit', resolve)
        electronProcess.kill()
        setTimeout(resolve, 3000)
    })
}

async function restartElectron() {
    if (restarting || stopping) {
        return
    }
    restarting = true
    console.log('Main process changed. Restarting Electron…')
    await stopElectron()
    startElectron()
    restarting = false
}

function createWatcher(config, name) {
    const compiler = rspack(config)
    let firstBuild = true
    const watcher = compiler.watch({}, (error, stats) => {
        if (error) {
            console.error(`${name} build failed:`, error)
            return
        }
        if (stats.hasErrors()) {
            console.error(stats.toString({ colors: true, errors: true }))
            return
        }
        console.log(`${name} build ready.`)
        if (firstBuild) {
            firstBuild = false
        } else if (electronProcess) {
            restartElectron()
        }
    })
    watchers.push(watcher)
    return watcher
}

async function stopAll(exitCode = 0) {
    if (stopping) {
        return
    }
    stopping = true
    await stopElectron()
    await Promise.all(watchers.map((watcher) => new Promise((resolve) => watcher.close(resolve))))
    await new Promise((resolve) => devServer.stop(resolve))
    process.exitCode = exitCode
}

async function main() {
    createWatcher(require('../configs/rspack/main.config'), 'Main')
    createWatcher(require('../configs/rspack/preload.config'), 'Preload')
    const rendererCompiler = rspack(require('../configs/rspack/renderer.config'))
    devServer = new RspackDevServer(
        {
            port: 5173,
            host: '127.0.0.1',
            hot: true,
            liveReload: true,
            historyApiFallback: true,
            devMiddleware: {
                publicPath: '/'
            },
            client: {
                logging: 'warn'
            }
        },
        rendererCompiler
    )
    await devServer.start()
    await waitForRenderer()
    console.log(`Renderer ready at ${rendererUrl}`)
    startElectron()
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
process.on('uncaughtException', async (error) => {
    console.error(error)
    await stopAll(1)
})

main().catch(async (error) => {
    console.error(error)
    await stopAll(1)
})
