import { describe, expect, it } from 'vitest'
import { buildRecurringReminderAt, buildRecurringReminderInput, formatRecurrence } from '../../src/renderer/lib/date'

function localDate(year, month, day, hour = 9) {
    return new Date(year, month - 1, day, hour, 0, 0)
}

describe('recurring reminder form patterns', () => {
    it('chooses the next daily time when today has passed', () => {
        const now = localDate(2026, 10, 22, 10)
        const result = buildRecurringReminderAt({ recurrenceType: 'daily' }, { reminderTime: '09:00' }, now)

        expect(new Date(result).getTime()).toBe(localDate(2026, 10, 23).getTime())
    })

    it('uses weekday and monthly day controls to choose the first occurrence', () => {
        const now = localDate(2026, 10, 22, 10)
        const weekly = buildRecurringReminderAt({ recurrenceType: 'weekly' }, { reminderWeekday: 1, reminderTime: '09:00' }, now)
        const monthly = buildRecurringReminderAt({ recurrenceType: 'monthly' }, { reminderDay: 31, reminderTime: '09:00' }, new Date(2026, 1, 20, 10, 0, 0))

        expect(new Date(weekly).getTime()).toBe(localDate(2026, 10, 26).getTime())
        expect(new Date(monthly).getTime()).toBe(localDate(2026, 3, 31).getTime())
    })

    it('schedules minute and hour patterns from the current time', () => {
        const now = new Date(2026, 10, 22, 10, 0, 20)
        const minute = buildRecurringReminderAt({ recurrenceType: 'minutely' }, {}, now)
        const hourly = buildRecurringReminderAt({ recurrenceType: 'hourly' }, { reminderTime: '09:15' }, now)
        const halfHour = buildRecurringReminderAt({ recurrenceType: 'custom', recurrenceInterval: 30, recurrenceUnit: 'minute' }, {}, now)

        expect(new Date(minute).getTime()).toBe(new Date(2026, 10, 22, 10, 1, 0).getTime())
        expect(new Date(hourly).getTime()).toBe(new Date(2026, 10, 22, 10, 15, 0).getTime())
        expect(new Date(halfHour).getTime()).toBe(new Date(2026, 10, 22, 10, 30, 0).getTime())
        expect(formatRecurrence('minutely')).toBe('每分钟')
        expect(formatRecurrence('custom', 2, 'hour')).toBe('每 2 小时')
    })

    it('keeps the form value in local input format for the date time picker', () => {
        const now = new Date(2026, 10, 22, 10, 0, 20)
        const value = buildRecurringReminderInput({ recurrenceType: 'daily' }, { reminderTime: '21:05' }, now)

        expect(value).toBe('2026-11-22T21:05')
    })

    it('finds the next valid leap day for a yearly pattern', () => {
        const now = localDate(2026, 2, 20, 10)
        const result = buildRecurringReminderAt(
            { recurrenceType: 'custom', recurrenceUnit: 'year' },
            { reminderMonth: 1, reminderDay: 29, reminderTime: '09:00' },
            now
        )

        expect(new Date(result).getTime()).toBe(localDate(2028, 2, 29).getTime())
        expect(formatRecurrence('custom', 3, 'month')).toBe('每 3 个月')
    })
})
