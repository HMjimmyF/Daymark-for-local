const fs = require('node:fs')
const path = require('node:path')
const { format } = require('date-fns')
const { DatabaseManager } = require('../database/connection')

function timestampForFile(date = new Date()) {
    return format(date, 'yyyyMMdd-HHmmss')
}

class BackupService {
    constructor({ databaseManager, settingsService, defaultBackupDirectory, now = () => new Date() }) {
        this.databaseManager = databaseManager
        this.settingsService = settingsService
        this.defaultBackupDirectory = defaultBackupDirectory
        this.now = now
        this.onBeforeRestore = null
        this.onAfterRestore = null
    }

    getBackupDirectory() {
        return this.settingsService.get().backupDirectory || this.defaultBackupDirectory
    }

    async create() {
        const directory = this.getBackupDirectory()
        fs.mkdirSync(directory, { recursive: true })
        const destination = path.join(directory, `daymark-backup-${timestampForFile(this.now())}.sqlite`)
        if (fs.existsSync(destination)) {
            throw new Error('同一时刻的备份已存在，请稍后重试')
        }

        await this.databaseManager.backup(destination)
        DatabaseManager.validateDatabase(destination)
        return {
            path: destination,
            size: fs.statSync(destination).size
        }
    }

    async restore(sourcePath) {
        const resolvedSource = path.resolve(sourcePath)
        const resolvedCurrent = path.resolve(this.databaseManager.databasePath)
        if (resolvedSource === resolvedCurrent) {
            throw new Error('所选文件就是当前数据库，无需恢复')
        }

        DatabaseManager.validateDatabase(resolvedSource)
        const emergency = await this.createEmergencyBackup()
        const stagingPath = `${resolvedCurrent}.restore-staging`

        try {
            fs.copyFileSync(resolvedSource, stagingPath)
            DatabaseManager.validateDatabase(stagingPath)
            this.onBeforeRestore?.()
            this.databaseManager.close()
            this.removeSidecars(resolvedCurrent)
            fs.copyFileSync(stagingPath, resolvedCurrent)
            this.databaseManager.open()
            DatabaseManager.validateDatabase(resolvedCurrent)
            this.onAfterRestore?.()
            return {
                restored: true,
                emergencyBackupPath: emergency
            }
        } catch (error) {
            this.databaseManager.close()
            this.removeSidecars(resolvedCurrent)
            fs.copyFileSync(emergency, resolvedCurrent)
            this.databaseManager.open()
            this.onAfterRestore?.()
            throw new Error(`恢复失败，当前数据已回滚。应急备份：${emergency}`)
        } finally {
            fs.rmSync(stagingPath, { force: true })
        }
    }

    async createEmergencyBackup() {
        const directory = this.getBackupDirectory()
        fs.mkdirSync(directory, { recursive: true })
        const destination = path.join(directory, `daymark-emergency-${timestampForFile(this.now())}.sqlite`)
        await this.databaseManager.backup(destination)
        DatabaseManager.validateDatabase(destination)
        return destination
    }

    removeSidecars(databasePath) {
        fs.rmSync(`${databasePath}-wal`, { force: true })
        fs.rmSync(`${databasePath}-shm`, { force: true })
    }
}

module.exports = {
    BackupService,
    timestampForFile
}
