const { addDays, addMonths, addWeeks } = require('date-fns')

const RECURRENCE_TYPES = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom']
const MAX_ADVANCE_STEPS = 200_000

function parseDate(value, label) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label}无效`)
    }
    return date
}

function addInterval(current, type, interval) {
    if (type === 'daily' || type === 'custom') {
        return addDays(current, interval)
    }
    if (type === 'weekly') {
        return addWeeks(current, interval)
    }
    if (type === 'weekdays') {
        let candidate = addDays(current, 1)
        while (candidate.getDay() === 0 || candidate.getDay() === 6) {
            candidate = addDays(candidate, 1)
        }
        return candidate
    }
    throw new Error('循环规则无效')
}

function nextMonthlyOccurrence(current, anchor, interval) {
    if (!anchor) {
        throw new Error('每月循环缺少起始时间')
    }
    let step = 1
    let candidate = addMonths(anchor, step * interval)
    while (candidate.getTime() <= current.getTime()) {
        step += 1
        if (step > MAX_ADVANCE_STEPS) {
            throw new Error('无法计算下一次每月提醒')
        }
        candidate = addMonths(anchor, step * interval)
    }
    return candidate
}

function getNextReminderAt(rule, currentRemindAt, after = new Date()) {
    const type = rule.recurrenceType || 'none'
    if (type === 'none') {
        return null
    }
    if (!RECURRENCE_TYPES.includes(type)) {
        throw new Error('循环规则无效')
    }

    const current = parseDate(currentRemindAt, '当前提醒时间')
    const afterDate = after instanceof Date ? after : parseDate(after, '比较时间')
    const until = rule.recurrenceUntil ? parseDate(rule.recurrenceUntil, '循环结束时间') : null
    const interval = Number(rule.recurrenceInterval) || 1
    const anchor = rule.recurrenceAnchorAt ? parseDate(rule.recurrenceAnchorAt, '循环起始时间') : current

    if (until && until.getTime() <= current.getTime()) {
        return null
    }

    let candidate = type === 'monthly' ? nextMonthlyOccurrence(current, anchor, interval) : addInterval(current, type, interval)

    let steps = 0
    while (candidate.getTime() <= afterDate.getTime()) {
        steps += 1
        if (steps > MAX_ADVANCE_STEPS) {
            throw new Error('无法计算下一次循环提醒')
        }
        candidate = type === 'monthly' ? nextMonthlyOccurrence(candidate, anchor, interval) : addInterval(candidate, type, interval)
    }

    if (until && candidate.getTime() > until.getTime()) {
        return null
    }
    return candidate.toISOString()
}

module.exports = {
    RECURRENCE_TYPES,
    getNextReminderAt
}
