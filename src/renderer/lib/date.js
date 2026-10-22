import { addDays, endOfDay, format, isSameDay, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const DEFAULT_REMINDER_TIME = '09:00'

export function formatDueDate(value) {
    if (!value) {
        return ''
    }
    const date = parseISO(value)
    if (isSameDay(date, new Date())) {
        return `今天 ${format(date, 'HH:mm')}`
    }
    if (isTomorrow(date)) {
        return `明天 ${format(date, 'HH:mm')}`
    }
    return format(date, 'M月d日 EEE HH:mm', { locale: zhCN })
}

export function formatShortDate(value) {
    if (!value) {
        return ''
    }
    return format(parseISO(value), 'M月d日 HH:mm', { locale: zhCN })
}

export function formatCompletedDate(value) {
    return value ? format(parseISO(value), 'M月d日 HH:mm 完成', { locale: zhCN }) : '已完成'
}

export function toDateTimeInput(value) {
    return value ? format(parseISO(value), "yyyy-MM-dd'T'HH:mm") : ''
}

export function fromDateTimeInput(value) {
    if (!value) {
        return null
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toDateInput(value) {
    return value ? format(parseISO(value), 'yyyy-MM-dd') : ''
}

export function fromDateInput(value) {
    if (!value) {
        return null
    }
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? null : endOfDay(date).toISOString()
}

export function formatRecurrence(type, interval = 1, unit = 'day') {
    const labels = {
        none: '',
        daily: '每天',
        weekdays: '工作日',
        weekly: '每周',
        monthly: '每月',
        custom: `每 ${interval} ${unit === 'month' ? '个月' : unit === 'year' ? '年' : '天'}`
    }
    return labels[type] || ''
}

export function toTimeInput(value) {
    if (!value) {
        return ''
    }
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? '' : format(date, 'HH:mm')
}

function parseLocalValue(value) {
    if (!value) {
        return null
    }
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? null : date
}

function atLocalTime(date, time) {
    const [hours, minutes] = (time || DEFAULT_REMINDER_TIME).split(':').map(Number)
    const result = new Date(date)
    result.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0)
    return result
}

function dateInMonth(year, month, day, time) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return day > lastDay ? null : atLocalTime(new Date(year, month, day), time)
}

export function buildRecurringReminderAt(value, patch = {}, referenceTime = new Date()) {
    const next = { ...value, ...patch }
    const now = referenceTime
    const base = parseLocalValue(next.remindAt) || parseLocalValue(next.dueAt) || now
    const time = next.reminderTime || toTimeInput(next.remindAt) || toTimeInput(next.dueAt) || DEFAULT_REMINDER_TIME
    const weekday = Number.isInteger(next.reminderWeekday) ? next.reminderWeekday : base.getDay()
    const dayOfMonth = Number.isInteger(next.reminderDay) ? next.reminderDay : base.getDate()
    const month = Number.isInteger(next.reminderMonth) ? next.reminderMonth : base.getMonth()
    const type = next.recurrenceType
    const unit = next.recurrenceUnit || 'day'

    if (type === 'daily' || type === 'weekdays' || (type === 'custom' && unit === 'day')) {
        let candidate = atLocalTime(now, time)
        if (type === 'weekdays') {
            while (candidate.getDay() === 0 || candidate.getDay() === 6) {
                candidate = addDays(candidate, 1)
            }
        }
        if (candidate.getTime() <= now.getTime()) {
            candidate = addDays(candidate, 1)
            if (type === 'weekdays') {
                while (candidate.getDay() === 0 || candidate.getDay() === 6) {
                    candidate = addDays(candidate, 1)
                }
            }
        }
        return candidate.toISOString()
    }

    if (type === 'weekly') {
        let candidate = atLocalTime(now, time)
        candidate = addDays(candidate, (weekday - candidate.getDay() + 7) % 7)
        if (candidate.getTime() <= now.getTime()) {
            candidate = addDays(candidate, 7)
        }
        return candidate.toISOString()
    }

    if (type === 'monthly' || (type === 'custom' && unit === 'month')) {
        let year = now.getFullYear()
        let monthIndex = now.getMonth()
        let candidate = dateInMonth(year, monthIndex, dayOfMonth, time)
        while (!candidate || candidate.getTime() <= now.getTime()) {
            monthIndex += 1
            if (monthIndex > 11) {
                monthIndex = 0
                year += 1
            }
            candidate = dateInMonth(year, monthIndex, dayOfMonth, time)
        }
        return candidate.toISOString()
    }

    if (type === 'custom' && unit === 'year') {
        let year = now.getFullYear()
        let candidate = dateInMonth(year, month, dayOfMonth, time)
        while (!candidate || candidate.getTime() <= now.getTime()) {
            year += 1
            candidate = dateInMonth(year, month, dayOfMonth, time)
        }
        return candidate.toISOString()
    }

    return next.remindAt || null
}

export function dateAt(hour, dayOffset = 0) {
    const date = addDays(startOfDay(new Date()), dayOffset)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
}

export function todayIso() {
    return startOfDay(new Date()).toISOString()
}

export function formatHeaderDate() {
    return format(new Date(), 'M月d日 EEEE', { locale: zhCN })
}
