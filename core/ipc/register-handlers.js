const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } = require('electron')
const { ZodError } = require('zod')
const { format } = require('date-fns')

function publicError(error) {
    if (error instanceof ZodError) {
        return {
            code: 'VALIDATION_ERROR',
            message: error.issues[0]?.message || '输入内容不合法'
        }
    }
    if (String(error?.code).includes('SQLITE_CONSTRAINT')) {
        return {
            code: 'CONFLICT',
            message: '数据存在冲突，请检查名称或关联项'
        }
    }
    return {
        code: 'OPERATION_ERROR',
        message: error?.message && String(error.message).length < 220 ? error.message : '操作失败，请稍后重试'
    }
}

function registerHandlers(context) {
    const { taskService, categoryService, settingsService, backupService, exportService, reminderService, databaseManager, shortcutManager, windowManager } =
        context

    const channels = []
    const handle = (channel, handler, { mutation = false } = {}) => {
        channels.push(channel)
        ipcMain.handle(channel, async (event, ...args) => {
            try {
                const data = await handler(event, ...args)
                if (mutation) {
                    windowManager.broadcast('data:changed')
                }
                return { ok: true, data }
            } catch (error) {
                console.error(`[daymark:${channel}]`, error instanceof Error ? error.message : error)
                return { ok: false, error: publicError(error) }
            }
        })
    }

    handle('tasks:list', (_event, filters) => taskService.list(filters))
    handle('tasks:get', (_event, id) => taskService.get(id))
    handle('tasks:counts', () => taskService.getCounts())
    handle('tasks:create', (_event, input) => taskService.create(input), { mutation: true })
    handle('tasks:update', (_event, id, patch) => taskService.update(id, patch), { mutation: true })
    handle('tasks:complete', (_event, id) => taskService.complete(id), { mutation: true })
    handle('tasks:reopen', (_event, id) => taskService.reopen(id), { mutation: true })
    handle('tasks:remove', (_event, id) => taskService.remove(id), { mutation: true })

    handle('categories:list', () => categoryService.list())
    handle('categories:create', (_event, input) => categoryService.create(input), { mutation: true })
    handle('categories:update', (_event, id, patch) => categoryService.update(id, patch), { mutation: true })
    handle('categories:remove', (_event, id) => categoryService.remove(id), { mutation: true })

    handle('settings:get', () => ({
        ...settingsService.get(),
        dataDirectory: path.dirname(databaseManager.databasePath),
        databasePath: databaseManager.databasePath,
        defaultBackupDirectory: backupService.defaultBackupDirectory,
        actualBackupDirectory: backupService.getBackupDirectory(),
        version: app.getVersion(),
        shortcutStatus: shortcutManager.getStatus()
    }))
    handle(
        'settings:update',
        (_event, patch) => {
            const previous = settingsService.get()
            const shortcutsChanged = Object.hasOwn(patch, 'toggleShortcut') || Object.hasOwn(patch, 'quickAddShortcut')
            const next = settingsService.update(patch)
            if (Object.hasOwn(patch, 'theme')) {
                nativeTheme.themeSource = next.theme
            }
            if (shortcutsChanged) {
                const registration = shortcutManager.apply(next)
                if (!registration.ok) {
                    settingsService.update({
                        toggleShortcut: previous.toggleShortcut,
                        quickAddShortcut: previous.quickAddShortcut
                    })
                    shortcutManager.apply(previous)
                    throw new Error('快捷键已被其他应用占用，请尝试其他组合')
                }
            }
            return {
                ...next,
                shortcutStatus: shortcutManager.getStatus()
            }
        },
        { mutation: true }
    )

    handle(
        'backup:create',
        async () => {
            const result = await backupService.create()
            return result
        },
        { mutation: false }
    )
    handle('backup:restore', async () => {
        const selected = await dialog.showOpenDialog(windowManager.mainWindow, {
            title: '选择日序数据库备份',
            properties: ['openFile'],
            filters: [
                { name: '日序数据库备份', extensions: ['sqlite', 'db'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        })
        if (selected.canceled || !selected.filePaths[0]) {
            return { cancelled: true }
        }
        const confirmation = await dialog.showMessageBox(windowManager.mainWindow, {
            type: 'warning',
            title: '确认恢复数据',
            message: '恢复会替换当前任务与分类数据。',
            detail: '日序会先为当前数据库创建应急备份。继续吗？',
            buttons: ['取消', '确认恢复'],
            defaultId: 0,
            cancelId: 0,
            noLink: true
        })
        if (confirmation.response !== 1) {
            return { cancelled: true }
        }
        return backupService.restore(selected.filePaths[0])
    })
    handle('backup:choose-directory', async () => {
        const selected = await dialog.showOpenDialog(windowManager.mainWindow, {
            title: '选择备份文件夹',
            properties: ['openDirectory', 'createDirectory']
        })
        if (selected.canceled || !selected.filePaths[0]) {
            return { cancelled: true }
        }
        const settings = settingsService.update({ backupDirectory: selected.filePaths[0] })
        return { path: selected.filePaths[0], settings }
    })

    handle('data:open-folder', async (_event, kind) => {
        const directory = kind === 'backup' ? backupService.getBackupDirectory() : path.dirname(databaseManager.databasePath)
        fs.mkdirSync(directory, { recursive: true })
        const error = await shell.openPath(directory)
        if (error) {
            throw new Error('无法打开文件夹')
        }
        return { opened: true }
    })

    const exportFile = async (type) => {
        const extension = type === 'json' ? 'json' : 'csv'
        const selected = await dialog.showSaveDialog(windowManager.mainWindow, {
            title: `导出${extension.toUpperCase()}数据`,
            defaultPath: path.join(app.getPath('documents'), `daymark-export-${format(new Date(), 'yyyyMMdd-HHmmss')}.${extension}`),
            filters: [{ name: extension === 'json' ? 'JSON 数据' : 'CSV 表格', extensions: [extension] }]
        })
        if (selected.canceled || !selected.filePath) {
            return { cancelled: true }
        }
        const content = type === 'json' ? exportService.getJson() : exportService.getCsv()
        fs.writeFileSync(selected.filePath, content, 'utf8')
        return { path: selected.filePath }
    }
    handle('export:json', () => exportFile('json'))
    handle('export:csv', () => exportFile('csv'))
    handle('reminders:status', () => reminderService.getStatus())
    handle('reminders:check-now', () => reminderService.check())
    handle('app:info', () => ({
        name: '日序 Daymark',
        version: app.getVersion(),
        electron: process.versions.electron,
        appUserModelId: process.platform === 'win32' ? '日序' : null
    }))

    handle('window:quick-add', () => {
        windowManager.showQuickAdd()
        return { opened: true }
    })
    handle('window:hide-quick-add', () => {
        windowManager.hideQuickAdd()
        return { hidden: true }
    })
    handle('window:show-main', () => {
        windowManager.showMain()
        return { shown: true }
    })
    handle('window:minimize', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
            throw new Error('窗口不存在')
        }
        window.minimize()
        return { minimized: true }
    })
    handle('window:toggle-maximize', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
            throw new Error('窗口不存在')
        }
        if (window.isMaximized()) {
            window.unmaximize()
        } else {
            window.maximize()
        }
        return { maximized: window.isMaximized() }
    })
    handle('window:get-state', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)
        return {
            maximized: Boolean(window?.isMaximized()),
            minimized: Boolean(window?.isMinimized())
        }
    })
    handle('window:close', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
            throw new Error('窗口不存在')
        }
        window.close()
        return { closing: true }
    })
    handle('window:open-devtools', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
            throw new Error('窗口不存在')
        }
        if (window.webContents.isDevToolsOpened()) {
            window.webContents.devToolsWebContents?.focus()
        } else {
            window.webContents.openDevTools({ mode: 'detach', activate: true })
        }
        return { opened: true }
    })

    return () => {
        for (const channel of channels) {
            ipcMain.removeHandler(channel)
        }
    }
}

module.exports = {
    publicError,
    registerHandlers
}
