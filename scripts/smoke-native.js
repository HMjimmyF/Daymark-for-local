const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

async function main() {
    const { DatabaseManager } = require('../core/database/connection')
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daymark-native-'))
    const databasePath = path.join(tempDir, 'smoke.sqlite')
    const manager = new DatabaseManager(databasePath)
    manager.open()
    const row = manager.db.prepare('SELECT 1 AS value').get()
    manager.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
    if (row.value !== 1) {
        throw new Error('SQLite smoke test returned an unexpected value')
    }
    console.log('Native SQLite module loaded and completed a transaction.')
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
