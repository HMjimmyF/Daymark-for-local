const SAFE_SETTING_KEYS = ['theme', 'closeToTray', 'startMinimized', 'reminderEnabled', 'toggleShortcut', 'quickAddShortcut']
const CSV_COLUMNS = [
    ['id', '任务 ID'],
    ['title', '标题'],
    ['description', '描述'],
    ['status', '状态'],
    ['priority', '优先级'],
    ['categoryName', '分类'],
    ['parentId', '父任务 ID'],
    ['dueAt', '截止时间'],
    ['remindAt', '提醒时间'],
    ['recurrenceType', '重复类型'],
    ['recurrenceInterval', '重复间隔'],
    ['recurrenceUntil', '重复结束时间'],
    ['completedAt', '完成时间'],
    ['createdAt', '创建时间'],
    ['updatedAt', '更新时间']
]

function csvCell(value) {
    if (value === null || value === undefined) {
        return ''
    }
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv(tasks) {
    const lines = [CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',')]
    for (const task of tasks) {
        lines.push(
            CSV_COLUMNS.map(([key]) => {
                const value = key === 'priority' ? ['无', '低', '中', '高'][task.priority] : task[key]
                return csvCell(value)
            }).join(',')
        )
    }
    return `\ufeff${lines.join('\r\n')}\r\n`
}

class ExportService {
    constructor({ taskRepository, categoryRepository, settingsService, now = () => new Date(), appVersion = '1.0.0' }) {
        this.taskRepository = taskRepository
        this.categoryRepository = categoryRepository
        this.settingsService = settingsService
        this.now = now
        this.appVersion = appVersion
    }

    getJson() {
        const settings = this.settingsService.get()
        return JSON.stringify(
            {
                format: 'daymark-export',
                version: 1,
                appVersion: this.appVersion,
                exportedAt: this.now().toISOString(),
                tasks: this.taskRepository.listForExport(),
                categories: this.categoryRepository.list(),
                settings: Object.fromEntries(SAFE_SETTING_KEYS.filter((key) => Object.hasOwn(settings, key)).map((key) => [key, settings[key]]))
            },
            null,
            2
        )
    }

    getCsv() {
        return toCsv(this.taskRepository.listForExport())
    }
}

module.exports = {
    CSV_COLUMNS,
    ExportService,
    csvCell,
    toCsv
}
