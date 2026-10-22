const path = require('node:path')
const { app, BrowserWindow, nativeImage } = require('electron')
const { pathToFileURL } = require('node:url')

class WindowManager {
    constructor({ settingsService, onQuickAddHidden }) {
        this.settingsService = settingsService
        this.onQuickAddHidden = onQuickAddHidden
        this.mainWindow = null
        this.quickAddWindow = null
        this.quitting = false
    }

    getIcon() {
        return nativeImage.createFromPath(path.join(app.getAppPath(), 'resources/app-icon.png'))
    }

    getTrayIcon() {
        return nativeImage.createFromPath(path.join(app.getAppPath(), 'resources/tray-icon.png'))
    }

    getPreloadPath() {
        return path.join(__dirname, '../preload/index.js')
    }

    getWebPreferences() {
        return {
            preload: this.getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: true
        }
    }

    loadRenderer(window, hash = '') {
        const devUrl = process.env.DAYMARK_DEV_URL
        if (devUrl) {
            const url = new URL(devUrl)
            url.hash = hash
            return window.loadURL(url.toString())
        }
        return window.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: hash || undefined })
    }

    secureWindow(window) {
        window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
        window.setMenu(null)
        window.setMenuBarVisibility(false)
        window.webContents.on('will-navigate', (event, url) => {
            const devUrl = process.env.DAYMARK_DEV_URL
            if (devUrl && url.startsWith(devUrl)) {
                return
            }
            const rendererDirectoryUrl = pathToFileURL(path.join(__dirname, '../renderer/')).toString()
            if (!devUrl && url.startsWith(rendererDirectoryUrl)) {
                return
            }
            event.preventDefault()
        })
    }

    createMainWindow() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            return this.mainWindow
        }

        this.mainWindow = new BrowserWindow({
            width: 1120,
            height: 740,
            minWidth: 800,
            minHeight: 560,
            show: false,
            frame: false,
            autoHideMenuBar: true,
            thickFrame: true,
            title: '日序',
            backgroundColor: '#f7f7f5',
            icon: this.getIcon(),
            webPreferences: this.getWebPreferences()
        })
        this.secureWindow(this.mainWindow)
        this.loadRenderer(this.mainWindow)
        this.mainWindow.once('ready-to-show', () => {
            if (!this.settingsService.get().startMinimized) {
                this.mainWindow.show()
            }
        })
        this.mainWindow.on('close', (event) => {
            if (!this.quitting && this.settingsService.get().closeToTray) {
                event.preventDefault()
                this.mainWindow.hide()
            }
        })
        this.mainWindow.on('closed', () => {
            this.mainWindow = null
        })
        this.mainWindow.on('maximize', () => {
            this.mainWindow?.webContents.send('window:maximized-changed', { maximized: true })
        })
        this.mainWindow.on('unmaximize', () => {
            this.mainWindow?.webContents.send('window:maximized-changed', { maximized: false })
        })
        return this.mainWindow
    }

    createQuickAddWindow() {
        if (this.quickAddWindow && !this.quickAddWindow.isDestroyed()) {
            this.quickAddWindow.show()
            this.quickAddWindow.focus()
            return this.quickAddWindow
        }

        this.quickAddWindow = new BrowserWindow({
            width: 560,
            height: 360,
            minWidth: 420,
            minHeight: 250,
            show: false,
            frame: false,
            resizable: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            title: '快速添加 · 日序',
            backgroundColor: '#fbfbfa',
            icon: this.getIcon(),
            webPreferences: this.getWebPreferences()
        })
        this.secureWindow(this.quickAddWindow)
        this.loadRenderer(this.quickAddWindow, 'quick-add')
        this.quickAddWindow.once('ready-to-show', () => {
            this.quickAddWindow.show()
            this.quickAddWindow.focus()
        })
        this.quickAddWindow.on('closed', () => {
            this.quickAddWindow = null
            this.onQuickAddHidden?.()
        })
        return this.quickAddWindow
    }

    showMain(view = null) {
        const window = this.createMainWindow()
        if (window.isMinimized()) {
            window.restore()
        }
        window.show()
        window.focus()
        if (view) {
            window.webContents.send('navigation:view', view)
        }
    }

    showQuickAdd() {
        return this.createQuickAddWindow()
    }

    hideQuickAdd() {
        if (this.quickAddWindow && !this.quickAddWindow.isDestroyed()) {
            this.quickAddWindow.hide()
            this.onQuickAddHidden?.()
        }
    }

    toggleMain() {
        const window = this.mainWindow
        if (window && !window.isDestroyed() && window.isVisible() && window.isFocused()) {
            window.hide()
            return
        }
        this.showMain()
    }

    broadcast(channel, payload) {
        for (const window of BrowserWindow.getAllWindows()) {
            if (!window.isDestroyed()) {
                window.webContents.send(channel, payload)
            }
        }
    }

    prepareToQuit() {
        this.quitting = true
    }
}

module.exports = {
    WindowManager
}
