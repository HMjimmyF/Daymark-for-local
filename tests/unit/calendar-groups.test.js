import { describe, expect, it } from 'vitest'
import { addDays, endOfMonth, startOfMonth } from 'date-fns'
import {
    buildDayDateTime,
    calendarDayKey,
    expandsOnCalendar,
    groupTasksByDay,
    highFrequencyTasksForDay,
    stepMonthWithin,
    taskOccurrences
} from '../../src/renderer/lib/calendar'

const at = (day, hours, minutes = 0) => new Date(2025, 2, day, hours, minutes, 0, 0).toISOString()
const march = { start: startOfMonth(new Date(2025, 2, 1)), end: endOfMonth(new Date(2025, 2, 1)) }

describe('calendar day grouping', () => {
    it('groups tasks by their scheduled day and orders them by time', () => {
        const groups = groupTasksByDay([
            { id: 'late', title: '晚间复盘', dueAt: at(10, 20) },
            { id: 'early', title: '晨会', dueAt: at(10, 9) },
            { id: 'other', title: '交房租', dueAt: at(11, 12) }
        ])

        expect([...groups.keys()]).toEqual(['2025-03-10', '2025-03-11'])
        expect(groups.get('2025-03-10').map((entry) => entry.task.id)).toEqual(['early', 'late'])
    })

    it('falls back to the reminder time when there is no due date', () => {
        const groups = groupTasksByDay([{ id: 'reminder', title: '喝水', dueAt: null, remindAt: at(12, 8) }])

        expect(groups.get('2025-03-12').map((entry) => entry.task.id)).toEqual(['reminder'])
    })

    it('ignores tasks without any scheduled time', () => {
        const groups = groupTasksByDay([{ id: 'someday', title: '读一本书', dueAt: null, remindAt: null }])

        expect(groups.size).toBe(0)
    })
})

describe('recurring occurrences on the calendar', () => {
    it('expands a daily recurrence into every day of the window', () => {
        const groups = groupTasksByDay(
            [{ id: 'water', title: '喝水', dueAt: at(1, 9), recurrenceType: 'daily', recurrenceInterval: 1, recurrenceUnit: 'day' }],
            march
        )

        expect(groups.size).toBe(31)
        expect(groups.get('2025-03-01')[0].isRecurrence).toBe(true)
        expect(groups.get('2025-03-31')[0].id).toBe('water@2025-03-31')
    })

    it('steps custom day intervals from the anchor', () => {
        const groups = groupTasksByDay(
            [{ id: 'review', title: '复盘', dueAt: at(1, 9), recurrenceType: 'custom', recurrenceInterval: 3, recurrenceUnit: 'day' }],
            march
        )

        expect([...groups.keys()].slice(0, 4)).toEqual(['2025-03-01', '2025-03-04', '2025-03-07', '2025-03-10'])
    })

    it('only expands weekdays for the workday recurrence', () => {
        const groups = groupTasksByDay([{ id: 'standup', title: '站会', dueAt: at(3, 9), recurrenceType: 'weekdays' }], march)
        const days = [...groups.keys()].map((key) => new Date(`${key}T00:00:00`).getDay())

        expect(groups.size).toBe(21)
        expect(days.every((day) => day !== 0 && day !== 6)).toBe(true)
    })

    it('expands monthly and yearly recurrences', () => {
        const monthly = taskOccurrences({ id: 'rent', dueAt: at(5, 10), recurrenceType: 'monthly' }, march)
        const yearly = taskOccurrences(
            { id: 'birthday', dueAt: new Date(2020, 2, 8, 10).toISOString(), recurrenceType: 'custom', recurrenceInterval: 1, recurrenceUnit: 'year' },
            march
        )

        expect(monthly.map((occurrence) => occurrence.at.getDate())).toEqual([5])
        expect(yearly.map((occurrence) => occurrence.at.getFullYear())).toEqual([2025])
        expect(yearly[0].at.getDate()).toBe(8)
    })

    it('keeps minute and hour recurrences out of the grid', () => {
        const tasks = [
            { id: 'minutes', title: '喝水', remindAt: at(1, 9), recurrenceType: 'custom', recurrenceInterval: 30, recurrenceUnit: 'minute' },
            { id: 'hours', title: '起身', remindAt: at(1, 9), recurrenceType: 'hourly' }
        ]

        expect(groupTasksByDay(tasks, march).size).toBe(0)
        expect(expandsOnCalendar(tasks[0])).toBe(false)
        expect(highFrequencyTasksForDay(tasks, new Date(2025, 2, 10)).map((task) => task.id)).toEqual(['minutes', 'hours'])
    })

    it('stops at the recurrence end date', () => {
        const occurrences = taskOccurrences({ id: 'limited', dueAt: at(1, 9), recurrenceType: 'daily', recurrenceUntil: at(4, 9) }, march)

        expect(occurrences.map((occurrence) => calendarDayKey(occurrence.at))).toEqual(['2025-03-01', '2025-03-02', '2025-03-03', '2025-03-04'])
    })

    it('uses the anchor for reminders that already advanced', () => {
        const occurrences = taskOccurrences(
            { id: 'daily', remindAt: at(20, 9), recurrenceAnchorAt: at(1, 9), recurrenceType: 'daily' },
            { start: new Date(2025, 2, 15), end: new Date(2025, 2, 17) }
        )

        expect(occurrences.map((occurrence) => calendarDayKey(occurrence.at))).toEqual(['2025-03-15', '2025-03-16', '2025-03-17'])
    })

    it('does not repeat tasks without a recurrence rule', () => {
        const occurrences = taskOccurrences({ id: 'once', dueAt: at(10, 9), recurrenceType: 'none' }, march)

        expect(occurrences).toHaveLength(1)
        expect(occurrences[0].kind).toBe('due')
    })

    it('still expands from the anchor after a due date is added', () => {
        const occurrences = taskOccurrences(
            { id: 'daily', remindAt: at(2, 9), recurrenceAnchorAt: at(1, 9), dueAt: at(20, 18), recurrenceType: 'daily' },
            { start: new Date(2025, 2, 1), end: new Date(2025, 2, 3) }
        )

        expect(occurrences.map((occurrence) => calendarDayKey(occurrence.at))).toEqual(['2025-03-01', '2025-03-02', '2025-03-03'])
        expect(occurrences.every((occurrence) => occurrence.kind === 'recurrence')).toBe(true)
    })

    it('places a task on both its deadline day and its reminder day', () => {
        const groups = groupTasksByDay([{ id: 'report', title: '周报', dueAt: at(10, 18), remindAt: at(9, 9) }])

        expect([...groups.keys()]).toEqual(['2025-03-09', '2025-03-10'])
        expect(groups.get('2025-03-09')[0].kind).toBe('remind')
        expect(groups.get('2025-03-10')[0].kind).toBe('due')
        expect(groups.get('2025-03-10')[0].id).toBe('report#due')
    })

    it('keeps a single entry when the deadline and the reminder share a day', () => {
        const groups = groupTasksByDay([{ id: 'report', title: '周报', dueAt: at(10, 18), remindAt: at(10, 9) }])

        expect(groups.get('2025-03-10')).toHaveLength(1)
        expect(groups.get('2025-03-10')[0].kind).toBe('due')
    })

    it('shows a deadline-only task on its deadline day', () => {
        const groups = groupTasksByDay([{ id: 'tax', title: '报税', dueAt: at(15, 12), remindAt: null, recurrenceType: 'none' }])

        expect([...groups.keys()]).toEqual(['2025-03-15'])
        expect(groups.get('2025-03-15')[0].kind).toBe('due')
    })
})

describe('calendar day helpers', () => {
    it('builds a timestamp on the selected day with the chosen time', () => {
        const result = new Date(buildDayDateTime(new Date(2025, 2, 10, 23, 45), '07:05'))

        expect(result.getFullYear()).toBe(2025)
        expect(result.getMonth()).toBe(2)
        expect(result.getDate()).toBe(10)
        expect(result.getHours()).toBe(7)
        expect(result.getMinutes()).toBe(5)
    })

    it('formats a local day key', () => {
        expect(calendarDayKey(new Date(2025, 0, 5))).toBe('2025-01-05')
        expect(calendarDayKey(addDays(new Date(2025, 0, 5), 1))).toBe('2025-01-06')
    })

    it('steps months forward and backward', () => {
        expect(calendarDayKey(stepMonthWithin(new Date(2025, 0, 31), 1))).toBe('2025-02-28')
        expect(calendarDayKey(stepMonthWithin(new Date(2025, 11, 15), -1))).toBe('2025-11-15')
    })

    it('clamps month stepping to the selectable range', () => {
        const range = { startMonth: new Date(2025, 0, 1), endMonth: new Date(2025, 11, 31) }

        expect(calendarDayKey(stepMonthWithin(new Date(2025, 0, 10), -1, range))).toBe('2025-01-01')
        expect(calendarDayKey(stepMonthWithin(new Date(2025, 11, 10), 1, range))).toBe('2025-12-01')
        expect(calendarDayKey(stepMonthWithin(new Date(2025, 5, 10), 1, range))).toBe('2025-07-10')
    })
})
