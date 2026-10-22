const { addDays, addMonths, addWeeks, addYears } = require('date-fns')

const RECURRENCE_TYPES = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom']
const CUSTOM_RECURRENCE_UNITS = ['day', 'month', 'year']
const MAX_ADVANCE_STEPS = 200_000

function parseDate(value, label) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label}无效`)
    }
    return date
}

function addInterval(current, type, interval, unit = 'day') {
    if (type === 'daily' || (type === 'custom' && unit === 'day')) {
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
    if (type === 'custom' && unit === 'month') {
        return addMonths(current, interval)
    }
    if (type === 'custom' && unit === 'year') {
        return addYears(current, interval)
    }
    throw new Error('循环规则无效')
}

function nextAnchoredOccurrence(current, anchor, interval, addFn) {
    if (!anchor) {
        throw new Error('按月或按年循环缺少起始时间')
    }
    let step = 1
    let candidate = addFn(anchor, step * interval)
    while (candidate.getTime() <= current.getTime()) {
        step += 1
        if (step > MAX_ADVANCE_STEPS) {
            throw new Error('无法计算下一次循环提醒')
        }
        candidate = addFn(anchor, step * interval)
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
    const unit = rule.recurrenceUnit || 'day'
    const anchor = rule.recurrenceAnchorAt ? parseDate(rule.recurrenceAnchorAt, '循环起始时间') : current

    if (type === 'custom' && !CUSTOM_RECURRENCE_UNITS.includes(unit)) {
        throw new Error('自定义循环单位无效')
    }

    if (until && until.getTime() <= current.getTime()) {
        return null
    }

    const anchoredAdd =
        type === 'monthly'
            ? (date, amount) => addMonths(date, amount)
            : type === 'custom' && unit === 'month'
              ? (date, amount) => addMonths(date, amount)
              : type === 'custom' && unit === 'year'
                ? (date, amount) => addYears(date, amount)
                : null
    const advance = (date) => (anchoredAdd ? nextAnchoredOccurrence(date, anchor, interval, anchoredAdd) : addInterval(date, type, interval, unit))

    let candidate = advance(current)

    let steps = 0
    while (candidate.getTime() <= afterDate.getTime()) {
        steps += 1
        if (steps > MAX_ADVANCE_STEPS) {
            throw new Error('无法计算下一次循环提醒')
        }
        candidate = advance(candidate)
    }

    if (until && candidate.getTime() > until.getTime()) {
        return null
    }
    return candidate.toISOString()
}

module.exports = {
    CUSTOM_RECURRENCE_UNITS,
    RECURRENCE_TYPES,
    getNextReminderAt
}
