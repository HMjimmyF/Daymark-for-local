const path = require('node:path')
const { app, BrowserWindow, Menu, nativeTheme } = require('electron')
const { DatabaseManager } = require('../../core/database/connection')
const { TaskRepository } = require('../../core/database/repositories/task-repository')
const { CategoryRepository } = require('../../core/database/repositories/category-repository')
const { SettingsRepository } = require('../../core/database/repositories/settings-repository')
const { TaskService } = require('../../core/services/task-service')
const { CategoryService } = require('../../core/services/category-service')
const { SettingsService } = require('../../core/services/settings-service')
const { BackupService } = require('../../core/services/backup-service')
const { ExportService } = require('../../core/services/export-service')
const { ReminderService } = require('../../core/services/reminder-service')
const { registerHandlers } = require('../../core/ipc/register-handlers')
const { WindowManager } = require('./windows')
const { createTray } = require('./tray')
const { ShortcutManager } = require('./shortcuts')
const { createNotifier } = require('./notifications')
const { applyContentSecurityPolicy } = require('./protocol')

Menu.setApplicationMenu(null)

const dataDirectoryArgument = process.argv.find((argument) => argument.startsWith('--daymark-data-dir='))
const requestedDataDirectory = app.commandLine.getSwitchValue('daymark-data-dir') || dataDirectoryArgument?.slice('--daymark-data-dir='.length)
if (requestedDataDirectory) {
    app.setPath('userData', path.resolve(requestedDataDirectory))
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
    app.quit()
}

let databaseManager
let windowManager
let tray
let shortcutManager
let reminderService
let unregisterHandlers
let quitting = false

async function initialize() {
    const userDataPath = app.getPath('userData')
    const databasePath = path.join(userDataPath, 'data', 'daymark.sqlite')
    const backupDirectory = path.join(userDataPath, 'backups')

    databaseManager = new DatabaseManager(databasePath)
    databaseManager.open()
    const database = databaseManager.db

    const taskRepository = new TaskRepository(database)
    const categoryRepository = new CategoryRepository(database)
    const settingsRepository = new SettingsRepository(database)
    const settingsService = new SettingsService({ settingsRepository })
    const taskService = new TaskService({ taskRepository, categoryRepository })
    const categoryService = new CategoryService({ categoryRepository })
    const backupService = new BackupService({ databaseManager, settingsService, defaultBackupDirectory: backupDirectory })
    const exportService = new ExportService({
        taskRepository,
        categoryRepository,
        settingsService,
        appVersion: app.getVersion()
    })

    windowManager = new WindowManager({ settingsService })
    shortcutManager = new ShortcutManager({ windowManager })
    const notify = createNotifier({ windowManager })
    reminderService = new ReminderService({ taskRepository, settingsService, notify })
    backupService.onBeforeRestore = () => reminderService.stop()
    backupService.onAfterRestore = () => {
        reminderService.start()
        windowManager.broadcast('data:changed')
    }

    nativeTheme.themeSource = settingsService.get().theme
    applyContentSecurityPolicy(require('electron').session.defaultSession)
    unregisterHandlers = registerHandlers({
        taskService,
        categoryService,
        settingsService,
        backupService,
        exportService,
        reminderService,
        databaseManager,
        shortcutManager,
        windowManager
    })

    windowManager.createMainWindow()
    tray = createTray({ app, windowManager })
    shortcutManager.apply(settingsService.get())
    reminderService.start()
}

app.on('second-instance', () => {
    windowManager?.showMain()
})

app.whenReady()
    .then(initialize)
    .catch((error) => {
        console.error(error)
        require('electron').dialog.showErrorBox('日序启动失败', '无法初始化本地数据库。请检查数据目录权限或联系支持。')
        app.quit()
    })

app.on('activate', () => {
    windowManager?.showMain()
})

app.on('before-quit', () => {
    if (quitting) {
        return
    }
    quitting = true
    windowManager?.prepareToQuit()
    reminderService?.stop()
    shortcutManager?.dispose()
    unregisterHandlers?.()
    tray?.destroy()
    databaseManager?.close()
})

app.on('window-all-closed', () => {
    if (!windowManager || !windowManager.settingsService.get().closeToTray) {
        app.quit()
    }
})
