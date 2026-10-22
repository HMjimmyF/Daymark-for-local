const path = require('node:path')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const electronExecutable = require('electron')
const electronVersion = require('electron/package.json').version
const betterSqliteDirectory = path.dirname(require.resolve('better-sqlite3/package.json'))
const prebuildInstall = path.join(root, 'node_modules/prebuild-install/bin.js')
const nativeBinary = path.join(betterSqliteDirectory, 'build/Release/better_sqlite3.node')

function canLoadWithElectron() {
    if (!fs.existsSync(nativeBinary)) {
        return false
    }
    const probe = spawnSync(electronExecutable, ['-e', "require('better-sqlite3').prepare('SELECT 1 AS value').get()"], {
        cwd: root,
        encoding: 'utf8',
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1'
        }
    })
    return probe.status === 0
}

if (canLoadWithElectron()) {
    console.log(`better-sqlite3 is already prepared for Electron ${electronVersion}.`)
    process.exit(0)
}

const result = spawnSync(process.execPath, [prebuildInstall, '--runtime=electron', `--target=${electronVersion}`, '--arch=x64', '--platform=win32'], {
    cwd: betterSqliteDirectory,
    stdio: 'inherit',
    env: process.env
})

if (result.status !== 0) {
    console.error(`Unable to install the Electron native SQLite binary for Electron ${electronVersion}.`)
    process.exit(result.status || 1)
}

console.log(`better-sqlite3 prepared for Electron ${electronVersion}.`)
