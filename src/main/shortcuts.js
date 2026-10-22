const { globalShortcut } = require('electron')

class ShortcutManager {
    constructor({ windowManager }) {
        this.windowManager = windowManager
        this.status = {
            toggle: 'unregistered',
            quickAdd: 'unregistered'
        }
    }

    apply(settings) {
        globalShortcut.unregisterAll()
        let toggleOk = false
        let quickAddOk = false
        try {
            toggleOk = globalShortcut.register(settings.toggleShortcut, () => this.windowManager.toggleMain())
        } catch {
            toggleOk = false
        }
        try {
            quickAddOk = globalShortcut.register(settings.quickAddShortcut, () => this.windowManager.showQuickAdd())
        } catch {
            quickAddOk = false
        }
        this.status = {
            toggle: toggleOk ? 'registered' : 'conflict',
            quickAdd: quickAddOk ? 'registered' : 'conflict'
        }
        return {
            ok: toggleOk && quickAddOk,
            ...this.status
        }
    }

    getStatus() {
        return this.status
    }

    dispose() {
        globalShortcut.unregisterAll()
    }
}

module.exports = {
    ShortcutManager
}
