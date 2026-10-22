import { describe, expect, it } from 'vitest'
import { buildRecurringReminderAt, formatRecurrence } from '../../src/renderer/lib/date'

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
