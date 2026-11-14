import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, endOfDay, format, parseISO, startOfDay, startOfMonth } from 'date-fns'

// 日程表只展开「日」及以上粒度的重复；分钟/小时级重复数量过大，只在当天的详情中提示。
const GRID_UNITS_BY_TYPE = {
    minutely: 'minute',
    hourly: 'hour',
    daily: 'day',
    weekdays: 'day',
    weekly: 'week',
    monthly: 'month'
}

const GRID_UNITS = new Set(['day', 'week', 'month', 'year'])
const DETAIL_ONLY_UNITS = new Set(['minute', 'hour'])
const MAX_OCCURRENCES = 400

export function taskCalendarDate(task) {
    const value = task?.dueAt || task?.remindAt
    if (!value) {
        return null
    }
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export function calendarDayKey(value) {
    const date = value instanceof Date ? value : parseISO(value)
    if (!date || Number.isNaN(date.getTime())) {
        return null
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value) {
    if (!value) {
        return null
    }
    const date = value instanceof Date ? value : parseISO(value)
    return Number.isNaN(date.getTime()) ? null : date
}

function recurrenceUnit(task) {
    const type = task?.recurrenceType
    if (!type || type === 'none') {
        return null
    }
    if (type === 'custom') {
        return task.recurrenceUnit || 'day'
    }
    return GRID_UNITS_BY_TYPE[type] ?? null
}

function recurrenceInterval(task) {
    const interval = Math.floor(Number(task?.recurrenceInterval))
    return Number.isFinite(interval) && interval > 0 ? interval : 1
}

/** 该任务是否在月历中按发生日展开（日/周/月/年）。 */
export function expandsOnCalendar(task) {
    const unit = recurrenceUnit(task)
    return unit === null || GRID_UNITS.has(unit)
}

/** 该任务是分钟或小时级重复，只在当天详情中提示。 */
export function isHighFrequencyRecurrence(task) {
    return DETAIL_ONLY_UNITS.has(recurrenceUnit(task))
}

/**
 * 重复任务的序列起点是 recurrenceAnchorAt（首次提醒时间，稳定不随提醒推进变化），
 * 只有历史数据缺少锚点时才退回截止时间或下一次提醒时间。
 */
function recurrenceBase(task) {
    if (recurrenceUnit(task)) {
        return parseDate(task?.recurrenceAnchorAt) || parseDate(task?.dueAt) || parseDate(task?.remindAt)
    }
    return parseDate(task?.dueAt) || parseDate(task?.remindAt)
}

function stepDay(base, step, interval) {
    return addDays(base, step * interval)
}

function stepWeek(base, step, interval) {
    return addWeeks(base, step * interval)
}

function stepMonth(base, step, interval) {
    return addMonths(base, step * interval)
}

function stepYear(base, step, interval) {
    return addYears(base, step * interval)
}

function firstStepWithin(base, start, unit, interval) {
    if (unit === 'month' || unit === 'year') {
        const months = (start.getFullYear() - base.getFullYear()) * 12 + (start.getMonth() - base.getMonth())
        const span = unit === 'year' ? months / 12 : months
        return span <= 0 ? 0 : Math.max(0, Math.floor(span / interval) - 1)
    }
    const days = differenceInCalendarDays(start, base)
    if (days <= 0) {
        return 0
    }
    const span = unit === 'week' ? days / 7 : days
    return Math.max(0, Math.floor(span / interval) - 1)
}

function listWeekdayOccurrences(base, until, start, end) {
    const occurrences = []
    let cursor = addDays(base, Math.max(0, differenceInCalendarDays(start, base) - 1))
    while (cursor.getDay() === 0 || cursor.getDay() === 6) {
        cursor = addDays(cursor, 1)
    }
    for (let guard = 0; guard < MAX_OCCURRENCES; guard += 1) {
        if (cursor.getTime() > end.getTime()) {
            break
        }
        if (until && cursor.getTime() > until.getTime()) {
            break
        }
        if (cursor.getTime() >= start.getTime()) {
            occurrences.push(cursor)
        }
        cursor = addDays(cursor, 1)
        while (cursor.getDay() === 0 || cursor.getDay() === 6) {
            cursor = addDays(cursor, 1)
        }
    }
    return occurrences
}

/**
 * 任务落在这段时间内的所有发生时间。非重复任务会返回截止日与提醒日
 * （同一天只算一次），分钟/小时级重复不参与月历展开。
 */
export function taskOccurrences(task, { start = null, end = null } = {}) {
    const unit = recurrenceUnit(task)
    if (DETAIL_ONLY_UNITS.has(unit)) {
        return []
    }

    const until = parseDate(task?.recurrenceUntil)
    const windowStart = start ? startOfDay(start) : null
    const windowEnd = end ? endOfDay(end) : null

    if (!unit) {
        const candidates = []
        const due = parseDate(task?.dueAt)
        const remind = parseDate(task?.remindAt)
        if (due) {
            candidates.push({ at: due, kind: 'due' })
        }
        if (remind && (!due || calendarDayKey(remind) !== calendarDayKey(due))) {
            candidates.push({ at: remind, kind: 'remind' })
        }
        return candidates.filter(
            (candidate) =>
                (!until || candidate.at.getTime() <= until.getTime()) &&
                (!windowStart || candidate.at.getTime() >= windowStart.getTime()) &&
                (!windowEnd || candidate.at.getTime() <= windowEnd.getTime())
        )
    }

    const base = recurrenceBase(task)
    if (!base) {
        return []
    }

    const interval = recurrenceInterval(task)
    const scanStart = windowStart ?? base
    const scanEnd = windowEnd ?? addYears(scanStart, 1)

    if (task.recurrenceType === 'weekdays') {
        return listWeekdayOccurrences(base, until, scanStart, scanEnd).map((at) => ({ at, kind: 'recurrence' }))
    }

    const step = unit === 'week' ? stepWeek : unit === 'month' ? stepMonth : unit === 'year' ? stepYear : stepDay
    const occurrences = []
    let index = firstStepWithin(base, scanStart, unit, interval)
    for (let guard = 0; guard < MAX_OCCURRENCES; guard += 1) {
        const at = step(base, index, interval)
        if (at.getTime() > scanEnd.getTime()) {
            break
        }
        if (until && at.getTime() > until.getTime()) {
            break
        }
        if (at.getTime() >= scanStart.getTime()) {
            occurrences.push({ at, kind: 'recurrence' })
        }
        index += 1
    }
    return occurrences
}

function compareDayEntries(a, b) {
    const timeDiff = a.at.getTime() - b.at.getTime()
    if (timeDiff !== 0) {
        return timeDiff
    }
    const priorityDiff = (b.task.priority ?? 0) - (a.task.priority ?? 0)
    if (priorityDiff !== 0) {
        return priorityDiff
    }
    return String(a.task.title).localeCompare(String(b.task.title), 'zh-Hans-CN')
}

/**
 * 按天分组。条目结构为 `{ id, task, at, kind }`，kind 取 `due` / `remind` / `recurrence`，
 * 重复任务会在每个发生日各产生一个条目。
 */
export function groupTasksByDay(tasks = [], { start = null, end = null } = {}) {
    const groups = new Map()
    for (const task of tasks) {
        for (const occurrence of taskOccurrences(task, { start, end })) {
            const key = calendarDayKey(occurrence.at)
            if (!key) {
                continue
            }
            const isRecurrence = occurrence.kind === 'recurrence'
            const entry = {
                id: isRecurrence ? `${task.id}@${format(occurrence.at, 'yyyy-MM-dd')}` : `${task.id}#${occurrence.kind}`,
                task,
                at: occurrence.at,
                kind: occurrence.kind,
                isRecurrence
            }
            const list = groups.get(key)
            if (list) {
                list.push(entry)
            } else {
                groups.set(key, [entry])
            }
        }
    }
    for (const list of groups.values()) {
        list.sort(compareDayEntries)
    }
    return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

/** 某一天需要展示在详情中的分钟/小时级重复任务。 */
export function highFrequencyTasksForDay(tasks, day) {
    if (!day || !tasks?.length) {
        return []
    }
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    return tasks.filter((task) => {
        if (!isHighFrequencyRecurrence(task)) {
            return false
        }
        const base = recurrenceBase(task)
        if (!base || base.getTime() > dayEnd.getTime()) {
            return false
        }
        const until = parseDate(task.recurrenceUntil)
        return !until || dayStart.getTime() <= until.getTime()
    })
}

/** 按月步进并限制在可选月份范围内，用于滚轮等方式翻月。 */
export function stepMonthWithin(month, delta, { startMonth = null, endMonth = null } = {}) {
    const next = addMonths(month, delta)
    if (startMonth && next.getTime() < startOfMonth(startMonth).getTime()) {
        return startOfMonth(startMonth)
    }
    if (endMonth && next.getTime() > startOfMonth(endMonth).getTime()) {
        return startOfMonth(endMonth)
    }
    return next
}

export function buildDayDateTime(day, time = '09:00') {
    if (!day) {
        return null
    }
    const [hours, minutes] = String(time || '09:00')
        .split(':')
        .map(Number)
    const result = new Date(day)
    result.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0)
    return result.toISOString()
}
