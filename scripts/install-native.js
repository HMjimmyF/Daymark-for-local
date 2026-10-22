const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const electronVersion = require('electron/package.json').version
const betterSqliteDirectory = path.dirname(require.resolve('better-sqlite3/package.json'))
const prebuildInstall = path.join(root, 'node_modules/prebuild-install/bin.js')

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
