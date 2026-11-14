import { addDays, addHours, addMinutes, format, isSameDay, isTomorrow, parseISO, startOfDay, startOfMinute } from 'date-fns'
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

export function formatRecurrence(type, interval = 1, unit = 'day') {
    const units = {
        minute: '分钟',
        hour: '小时',
        day: '天',
        month: '个月',
        year: '年'
    }
    const labels = {
        none: '',
        minutely: '每分钟',
        hourly: '每小时',
        daily: '每天',
        weekdays: '工作日',
        weekly: '每周',
        monthly: '每月',
        custom: `每 ${interval} ${units[unit] || '天'}`
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

function nextWeekday(date) {
    let candidate = date
    while (candidate.getDay() === 0 || candidate.getDay() === 6) {
        candidate = addDays(candidate, 1)
    }
    return candidate
}

/** 重复开始时间（recurrenceAnchorAt）在未来时作为首次提醒的计算起点和周期基准。 */
function resolveRecurrenceOrigin(value, now) {
    const start = parseLocalValue(value.recurrenceAnchorAt)
    const futureStart = start && start.getTime() > now.getTime() ? start : null
    return {
        origin: futureStart || now,
        base: futureStart || parseLocalValue(value.remindAt) || parseLocalValue(value.dueAt) || now,
        // 未来的开始时间本身算作第一次提醒；过去或未设置时按“当前时间之后”计算。
        tooEarly: futureStart ? (candidate) => candidate.getTime() < futureStart.getTime() : (candidate) => candidate.getTime() <= now.getTime()
    }
}

export function buildRecurringReminderAt(value, patch = {}, referenceTime = new Date()) {
    const next = { ...value, ...patch }
    const now = referenceTime
    const { origin, base, tooEarly } = resolveRecurrenceOrigin(next, now)
    const time = next.reminderTime || toTimeInput(next.remindAt) || toTimeInput(next.dueAt) || DEFAULT_REMINDER_TIME
    const weekday = Number.isInteger(next.reminderWeekday) ? next.reminderWeekday : base.getDay()
    const dayOfMonth = Number.isInteger(next.reminderDay) ? next.reminderDay : base.getDate()
    const month = Number.isInteger(next.reminderMonth) ? next.reminderMonth : base.getMonth()
    const type = next.recurrenceType
    const unit = next.recurrenceUnit || 'day'

    if (type === 'minutely' || (type === 'custom' && unit === 'minute')) {
        const step = type === 'minutely' ? 1 : Math.max(1, Number(next.recurrenceInterval) || 1)
        let candidate = startOfMinute(origin)
        while (tooEarly(candidate)) {
            candidate = addMinutes(candidate, step)
        }
        return candidate.toISOString()
    }

    if (type === 'hourly' || (type === 'custom' && unit === 'hour')) {
        const step = type === 'hourly' ? 1 : Math.max(1, Number(next.recurrenceInterval) || 1)
        let candidate = atLocalTime(origin, time)
        while (tooEarly(candidate)) {
            candidate = addHours(candidate, step)
        }
        return candidate.toISOString()
    }

    if (type === 'daily' || type === 'weekdays' || (type === 'custom' && unit === 'day')) {
        let candidate = atLocalTime(origin, time)
        if (type === 'weekdays') {
            candidate = nextWeekday(candidate)
        }
        while (tooEarly(candidate)) {
            candidate = addDays(candidate, 1)
            if (type === 'weekdays') {
                candidate = nextWeekday(candidate)
            }
        }
        return candidate.toISOString()
    }

    if (type === 'weekly') {
        let candidate = atLocalTime(origin, time)
        candidate = addDays(candidate, (weekday - candidate.getDay() + 7) % 7)
        while (tooEarly(candidate)) {
            candidate = addDays(candidate, 7)
        }
        return candidate.toISOString()
    }

    if (type === 'monthly' || (type === 'custom' && unit === 'month')) {
        let year = origin.getFullYear()
        let monthIndex = origin.getMonth()
        let candidate = dateInMonth(year, monthIndex, dayOfMonth, time)
        while (!candidate || tooEarly(candidate)) {
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
        let year = origin.getFullYear()
        let candidate = dateInMonth(year, month, dayOfMonth, time)
        while (!candidate || tooEarly(candidate)) {
            year += 1
            candidate = dateInMonth(year, month, dayOfMonth, time)
        }
        return candidate.toISOString()
    }

    return next.remindAt || null
}

export function buildRecurringReminderInput(value, patch = {}, referenceTime = new Date()) {
    const isoValue = buildRecurringReminderAt(value, patch, referenceTime)
    return isoValue ? toDateTimeInput(isoValue) : ''
}

/** 重复开始时间未填写时，优先沿用任务已有的提醒/截止时间（日程表中新建的任务即为当天）。 */
function defaultRecurrenceStart(value, referenceTime) {
    const existing = parseLocalValue(value.remindAt) || parseLocalValue(value.dueAt)
    return toDateTimeInput((existing || referenceTime).toISOString())
}

export function applyRecurrenceFormPatch(value, patch, referenceTime = new Date()) {
    const next = { ...value, ...patch }
    const ruleShapeChanged = Object.hasOwn(patch, 'recurrenceType') || Object.hasOwn(patch, 'recurrenceUnit') || Object.hasOwn(patch, 'recurrenceAnchorAt')
    if (next.recurrenceType === 'none') {
        next.recurrenceAnchorAt = ''
        return next
    }
    if (Object.hasOwn(patch, 'recurrenceType') && !next.recurrenceAnchorAt) {
        next.recurrenceAnchorAt = defaultRecurrenceStart(next, referenceTime)
    }
    if (ruleShapeChanged || !next.remindAt) {
        next.remindAt = buildRecurringReminderInput(next, {}, referenceTime)
    }
    return next
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
