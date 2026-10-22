const { getNextReminderAt } = require('../lib/recurrence')

class ReminderService {
    constructor({ taskRepository, settingsService, notify, now = () => new Date(), intervalMs = 30_000 }) {
        this.taskRepository = taskRepository
        this.settingsService = settingsService
        this.notify = notify
        this.now = now
        this.intervalMs = intervalMs
        this.timer = null
        this.checking = false
        this.lastCheckedAt = null
        this.lastDeliveredCount = 0
    }

    start() {
        if (this.timer) {
            return
        }
        this.check()
        this.timer = setInterval(() => this.check(), this.intervalMs)
    }

    stop() {
        clearInterval(this.timer)
        this.timer = null
    }

    check() {
        if (this.checking) {
            return { checked: 0, delivered: 0 }
        }
        const settings = this.settingsService.get()
        if (!settings.reminderEnabled) {
            return { checked: 0, delivered: 0 }
        }

        this.checking = true
        const now = this.now()
        try {
            const due = this.taskRepository.listDueReminders(now.toISOString())
            const direct = due.slice(0, 5)
            for (const task of direct) {
                this.notify({
                    title: '日序提醒',
                    body: task.title,
                    taskId: task.id
                })
                this.settleOccurrence(task, now)
            }
            if (due.length > direct.length) {
                const extraCount = due.length - direct.length
                this.notify({
                    title: '还有待办提醒',
                    body: `另有 ${extraCount} 项任务已到提醒时间`,
                    taskId: null
                })
                for (const task of due.slice(direct.length)) {
                    this.settleOccurrence(task, now)
                }
            }
            this.lastCheckedAt = now.toISOString()
            this.lastDeliveredCount = due.length
            return { checked: due.length, delivered: due.length }
        } finally {
            this.checking = false
        }
    }

    settleOccurrence(task, now) {
        const deliveredAt = now.toISOString()
        const nextRemindAt =
            task.recurrenceType === 'none'
                ? undefined
                : getNextReminderAt(
                      {
                          recurrenceType: task.recurrenceType,
                          recurrenceInterval: task.recurrenceInterval,
                          recurrenceAnchorAt: task.recurrenceAnchorAt,
                          recurrenceUntil: task.recurrenceUntil
                      },
                      task.remindAt,
                      now
                  )
        this.taskRepository.completeReminderOccurrence({
            taskId: task.id,
            currentRemindAt: task.remindAt,
            deliveredAt,
            nextRemindAt
        })
    }

    getStatus() {
        const settings = this.settingsService.get()
        return {
            enabled: settings.reminderEnabled,
            running: Boolean(this.timer),
            supported: this.notify.supported?.() ?? true,
            intervalMs: this.intervalMs,
            lastCheckedAt: this.lastCheckedAt,
            lastDeliveredCount: this.lastDeliveredCount,
            exitedAppLimitation: '应用完全退出后，定时器无法继续发送提醒。'
        }
    }
}

module.exports = {
    ReminderService
}
