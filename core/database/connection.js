const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')
const { applyMigrations, LATEST_SCHEMA_VERSION } = require('./migrations')

class DatabaseManager {
    constructor(databasePath) {
        this.databasePath = databasePath
        this.db = null
    }

    open() {
        if (this.db) {
            return this.db
        }

        if (this.databasePath !== ':memory:') {
            fs.mkdirSync(path.dirname(this.databasePath), { recursive: true })
        }

        this.db = new Database(this.databasePath)
        this.db.pragma('journal_mode = WAL')
        this.db.pragma('foreign_keys = ON')
        this.db.pragma('busy_timeout = 5000')
        applyMigrations(this.db)
        return this.db
    }

    close() {
        if (this.db) {
            this.db.close()
            this.db = null
        }
    }

    reopen() {
        this.close()
        return this.open()
    }

    async backup(destination) {
        if (!this.db) {
            throw new Error('数据库尚未打开')
        }
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        await this.db.backup(destination)
        return destination
    }

    static validateDatabase(databasePath) {
        if (!fs.existsSync(databasePath) || !fs.statSync(databasePath).isFile()) {
            throw new Error('所选备份文件不存在')
        }
        if (fs.statSync(databasePath).size < 512) {
            throw new Error('所选文件不是有效的日序数据库备份')
        }

        let database
        try {
            database = new Database(databasePath, { readonly: true, fileMustExist: true })
            const integrity = database.pragma('integrity_check', { simple: true })
            if (integrity !== 'ok') {
                throw new Error('备份完整性检查失败')
            }
            const version = database.pragma('user_version', { simple: true })
            if (!Number.isInteger(version) || version < 1 || version > LATEST_SCHEMA_VERSION) {
                throw new Error('备份版本与当前应用不兼容')
            }
            database.prepare('SELECT COUNT(*) AS count FROM tasks').get()
            database.prepare('SELECT COUNT(*) AS count FROM categories').get()
            return { version, size: fs.statSync(databasePath).size }
        } finally {
            database?.close()
        }
    }
}

module.exports = {
    DatabaseManager
}
