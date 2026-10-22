const { spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'
const electron = require('electron')

const rebuild = spawnSync(yarn, ['native:electron'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
})

if (rebuild.status !== 0) {
    process.exit(rebuild.status || 1)
}

const result = spawnSync(electron, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run'], {
    cwd: root,
    stdio: 'inherit',
    env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1'
    }
})

process.exit(result.status ?? 1)
