import { describe, expect, it } from 'vitest'
import { getNextReminderAt } from '../../core/lib/recurrence'

function localDate(year, month, day, hour = 9) {
    return new Date(year, month - 1, day, hour, 0, 0)
}

describe('recurring reminder schedule', () => {
    it('advances daily reminders across calendar boundaries', () => {
        const current = localDate(2026, 12, 31)
        const after = localDate(2027, 1, 4, 10)
        const next = getNextReminderAt({ recurrenceType: 'daily', recurrenceInterval: 1 }, current.toISOString(), after)

        expect(new Date(next).getTime()).toBe(localDate(2027, 1, 5).getTime())
    })

    it('advances workday reminders from Friday to Monday', () => {
        const friday = localDate(2026, 10, 23)
        const next = getNextReminderAt({ recurrenceType: 'weekdays', recurrenceInterval: 1 }, friday.toISOString(), friday)

        expect(new Date(next).getTime()).toBe(localDate(2026, 10, 26).getTime())
    })

    it('keeps the monthly anchor when a short month is crossed', () => {
        const january = localDate(2026, 1, 31)
        const february = getNextReminderAt(
            {
                recurrenceType: 'monthly',
                recurrenceInterval: 1,
                recurrenceAnchorAt: january.toISOString()
            },
            january.toISOString(),
            january
        )
        const march = getNextReminderAt(
            {
                recurrenceType: 'monthly',
                recurrenceInterval: 1,
                recurrenceAnchorAt: january.toISOString()
            },
            february,
            new Date(february)
        )

        expect(new Date(february).getTime()).toBe(localDate(2026, 2, 28).getTime())
        expect(new Date(march).getTime()).toBe(localDate(2026, 3, 31).getTime())
    })

    it('supports custom day intervals and stops at the end date', () => {
        const current = localDate(2026, 10, 22)
        const next = getNextReminderAt(
            {
                recurrenceType: 'custom',
                recurrenceInterval: 3,
                recurrenceUntil: localDate(2026, 10, 28, 23).toISOString()
            },
            current.toISOString(),
            current
        )
        expect(new Date(next).getTime()).toBe(localDate(2026, 10, 25).getTime())

        const ended = getNextReminderAt(
            {
                recurrenceType: 'daily',
                recurrenceInterval: 1,
                recurrenceUntil: localDate(2026, 10, 22, 23).toISOString()
            },
            current.toISOString(),
            localDate(2026, 10, 22, 10)
        )
        expect(ended).toBeNull()
    })

    it('supports custom month and year intervals from a stable anchor', () => {
        const january = localDate(2026, 1, 31)
        const april = getNextReminderAt(
            {
                recurrenceType: 'custom',
                recurrenceInterval: 3,
                recurrenceUnit: 'month',
                recurrenceAnchorAt: january.toISOString()
            },
            january.toISOString(),
            january
        )
        expect(new Date(april).getTime()).toBe(localDate(2026, 4, 30).getTime())

        const leapDay = localDate(2028, 2, 29)
        const nextYear = getNextReminderAt(
            {
                recurrenceType: 'custom',
                recurrenceInterval: 1,
                recurrenceUnit: 'year',
                recurrenceAnchorAt: leapDay.toISOString()
            },
            leapDay.toISOString(),
            leapDay
        )
        expect(new Date(nextYear).getTime()).toBe(localDate(2029, 2, 28).getTime())
    })

    it('rejects an unknown custom recurrence unit', () => {
        const current = localDate(2026, 10, 22)
        expect(() =>
            getNextReminderAt(
                {
                    recurrenceType: 'custom',
                    recurrenceInterval: 1,
                    recurrenceUnit: 'week',
                    recurrenceAnchorAt: current.toISOString()
                },
                current.toISOString(),
                current
            )
        ).toThrow('自定义循环单位无效')
    })
})
