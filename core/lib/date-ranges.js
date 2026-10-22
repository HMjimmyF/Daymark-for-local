const { addDays, startOfDay } = require('date-fns')

function getViewDateRanges(now = new Date()) {
    const todayStart = startOfDay(now)
    const tomorrowStart = addDays(todayStart, 1)
    const sevenDayEnd = addDays(todayStart, 7)

    return {
        todayStart: todayStart.toISOString(),
        tomorrowStart: tomorrowStart.toISOString(),
        sevenDayEnd: sevenDayEnd.toISOString()
    }
}

module.exports = {
    getViewDateRanges
}
