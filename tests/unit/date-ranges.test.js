import { addDays, startOfDay, subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { getViewDateRanges } from '../../core/lib/date-ranges'

describe('local calendar ranges', () => {
    it('includes today and six future local days in the upcoming range', () => {
        const now = new Date(2026, 9, 22, 10, 30)
        const ranges = getViewDateRanges(now)

        expect(new Date(ranges.todayStart).getTime()).toBe(startOfDay(now).getTime())
        expect(new Date(ranges.tomorrowStart).getTime()).toBe(addDays(startOfDay(now), 1).getTime())
        expect(new Date(ranges.sevenDayEnd).getTime()).toBe(addDays(startOfDay(now), 7).getTime())
    })

    it('uses calendar days across month and year boundaries', () => {
        const now = new Date(2026, 11, 29, 23, 15)
        const ranges = getViewDateRanges(now)

        expect(new Date(ranges.sevenDayEnd).getTime()).toBe(addDays(startOfDay(now), 7).getTime())
        expect(new Date(ranges.todayStart).getTime()).toBeGreaterThan(new Date(subDays(now, 1)).getTime())
    })
})
