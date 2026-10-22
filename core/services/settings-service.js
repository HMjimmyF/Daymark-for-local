const { settingsPatchSchema } = require('../validation/task-schemas')

const DEFAULT_SETTINGS = Object.freeze({
    theme: 'system',
    closeToTray: true,
    startMinimized: false,
    reminderEnabled: true,
    toggleShortcut: 'Control+Alt+T',
    quickAddShortcut: 'Control+Alt+Space',
    backupDirectory: null
})

class SettingsService {
    constructor({ settingsRepository, now = () => new Date() }) {
        this.settingsRepository = settingsRepository
        this.now = now
    }

    get() {
        return {
            ...DEFAULT_SETTINGS,
            ...this.settingsRepository.getAllRaw()
        }
    }

    update(patch) {
        const parsed = settingsPatchSchema.parse(patch)
        this.settingsRepository.setMany(parsed, this.now().toISOString())
        return this.get()
    }
}

module.exports = {
    DEFAULT_SETTINGS,
    SettingsService
}
