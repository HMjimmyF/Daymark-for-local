const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const archiver = require('archiver')

const root = path.resolve(__dirname, '..')
const packageJson = require('../package.json')
const unpacked = path.join(root, 'release/win-unpacked')
const zipPath = path.join(root, 'release', `Daymark-${packageJson.version}-win-x64.zip`)

function archiveDirectory() {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath)
        const archive = archiver('zip', { zlib: { level: 9 } })
        output.on('close', () => resolve())
        output.on('error', reject)
        archive.on('error', reject)
        archive.pipe(output)
        archive.directory(unpacked, false)
        archive.finalize()
    })
}

async function main() {
    if (!fs.existsSync(path.join(unpacked, '日序.exe'))) {
        throw new Error('Windows unpacked application was not found. Run package:win first.')
    }
    fs.rmSync(zipPath, { force: true })
    await archiveDirectory()
    const hash = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex')
    console.log(`Created ${zipPath}`)
    console.log(`SHA-256 ${hash}`)
}

main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
})
