import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CalendarCheck, CalendarClock, ChevronDown } from 'lucide-react'
import { CalendarDayDrawer } from '@/components/calendar/CalendarDayDrawer'
import { Button } from '@/components/ui/button'
import { useCalendarTasks } from '@/hooks/use-app-data'
import { calendarDayKey, groupTasksByDay, highFrequencyTasksForDay, stepMonthWithin } from '@/lib/calendar'
import { useAppStore } from '@/stores/app-store'
import 'react-day-picker/style.css'

const CalendarDayTasksContext = createContext(new Map())

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const CALENDAR_YEAR_SPAN = 50

// 每个日期格最多列出的任务条数，超出部分以“+N”角标提示，完整列表在当天抽屉中查看。
const MAX_VISIBLE_ITEMS = 3

function ScheduleDayButton({ day, modifiers, className, ...buttonProps }) {
    const groups = useContext(CalendarDayTasksContext)
    const entries = groups.get(calendarDayKey(day.date)) ?? []
    const visible = entries.slice(0, MAX_VISIBLE_ITEMS)
    const hiddenCount = entries.length - visible.length
    const buttonRef = useRef(null)

    useEffect(() => {
        if (modifiers.focused) {
            buttonRef.current?.focus()
        }
    }, [modifiers.focused])

    const classes = [className, 'calendar-day', modifiers.outside && 'is-outside', modifiers.today && 'is-today', modifiers.active && 'is-active']
        .filter(Boolean)
        .join(' ')
    const summary = entries.length ? `，${entries.length} 项日程` : ''

    return (
        <button ref={buttonRef} {...buttonProps} className={classes} aria-label={`${format(day.date, 'M月d日')}${summary}`}>
            <span className="calendar-day-head">
                <span className="calendar-day-number">{format(day.date, 'd')}</span>
                {hiddenCount > 0 && <span className="calendar-day-more">+{hiddenCount}</span>}
            </span>
            {entries.length > 0 && (
                <span className="calendar-day-items">
                    {visible.map((entry) => (
                        <span key={entry.id} className={`calendar-day-item${entry.isRecurrence ? ' is-recurrence' : ''}`}>
                            <span className="calendar-day-item-time">{format(entry.at, 'HH:mm')}</span>
                            <span className="calendar-day-item-title">{entry.task.title}</span>
                        </span>
                    ))}
                </span>
            )}
        </button>
    )
}

function ScheduleDropdown({ options, classNames: _classNames, components: _components, className: _className, ...selectProps }) {
    return (
        <span className="calendar-select">
            <select {...selectProps}>
                {(options ?? []).map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown size={12} strokeWidth={2.4} aria-hidden="true" />
        </span>
    )
}

const DAY_PICKER_COMPONENTS = { DayButton: ScheduleDayButton, Dropdown: ScheduleDropdown }

const DAY_PICKER_FORMATTERS = {
    formatCaption: (month) => format(month, 'yyyy年M月'),
    formatMonthDropdown: (month) => `${month.getMonth() + 1}月`,
    formatYearDropdown: (month) => `${month.getFullYear()}年`,
    formatWeekdayName: (weekday) => WEEKDAY_LABELS[weekday.getDay()]
}

export function CalendarPage({ search, onOpen, onComplete, onRemove }) {
    const { tasks, loading } = useCalendarTasks(search)
    const [month, setMonth] = useState(() => new Date())
    const [yearRange] = useState(() => {
        const year = new Date().getFullYear()
        return { startMonth: new Date(year - CALENDAR_YEAR_SPAN, 0, 1), endMonth: new Date(year + CALENDAR_YEAR_SPAN, 11, 31) }
    })
    // 抽屉状态放在全局 store 中，才能在任何来源的视图切换时统一收起。
    const selectedDay = useAppStore((state) => state.calendarDay)
    const openCalendarDay = useAppStore((state) => state.openCalendarDay)
    const closeCalendarDay = useAppStore((state) => state.closeCalendarDay)

    // 展开范围覆盖整张月历网格（前后各一周），重复任务会在每一次发生日出现。
    const visibleRange = useMemo(() => ({ start: addDays(startOfMonth(month), -7), end: addDays(endOfMonth(month), 7) }), [month])
    const groups = useMemo(() => groupTasksByDay(tasks, visibleRange), [tasks, visibleRange])

    const monthKey = format(month, 'yyyy-MM')
    const monthTaskCount = useMemo(() => {
        let count = 0
        for (const [key, list] of groups) {
            if (key.startsWith(monthKey)) {
                count += list.length
            }
        }
        return count
    }, [groups, monthKey])

    const modifiers = useMemo(() => ({ active: selectedDay ? [selectedDay] : [] }), [selectedDay])

    const dayEntries = selectedDay ? (groups.get(calendarDayKey(selectedDay)) ?? []) : []
    const dayHighFrequencyTasks = useMemo(() => highFrequencyTasksForDay(tasks, selectedDay), [tasks, selectedDay])

    // 滚轮翻月：必须用原生非被动监听，React 的 onWheel 无法阻止默认滚动。
    const panelRef = useRef(null)
    useEffect(() => {
        const node = panelRef.current
        if (!node) {
            return undefined
        }
        // 灵敏度写在 effect 内，保证与监听函数处于同一作用域。
        const MIN_DELTA = 12
        const COOLDOWN = 220
        let lastStepAt = 0
        const normalize = (event) => {
            if (event.deltaMode === 1) {
                return event.deltaY * 16
            }
            if (event.deltaMode === 2) {
                return event.deltaY * 100
            }
            return event.deltaY
        }
        const onWheel = (event) => {
            const deltaY = normalize(event)
            if (event.ctrlKey || event.metaKey || Math.abs(deltaY) < MIN_DELTA) {
                return
            }
            event.preventDefault()
            const now = Date.now()
            if (now - lastStepAt < COOLDOWN) {
                return
            }
            lastStepAt = now
            const delta = deltaY > 0 ? 1 : -1
            setMonth((current) => stepMonthWithin(current, delta, yearRange))
        }
        node.addEventListener('wheel', onWheel, { passive: false })
        return () => node.removeEventListener('wheel', onWheel)
    }, [yearRange])

    const goToToday = () => {
        setMonth(new Date())
    }

    return (
        <section className="calendar-page" aria-label="日程表">
            <div className="calendar-panel" ref={panelRef}>
                <CalendarDayTasksContext.Provider value={groups}>
                    <DayPicker
                        className="calendar-grid"
                        locale={zhCN}
                        weekStartsOn={1}
                        navLayout="after"
                        month={month}
                        onMonthChange={setMonth}
                        onDayClick={openCalendarDay}
                        showOutsideDays
                        fixedWeeks
                        captionLayout="dropdown"
                        startMonth={yearRange.startMonth}
                        endMonth={yearRange.endMonth}
                        modifiers={modifiers}
                        components={DAY_PICKER_COMPONENTS}
                        formatters={DAY_PICKER_FORMATTERS}
                    />
                </CalendarDayTasksContext.Provider>
                <div className="calendar-panel-foot">
                    <span className={`calendar-panel-meta${loading ? ' loading' : ''}`}>
                        {loading ? '正在同步任务…' : monthTaskCount ? `本月 ${monthTaskCount} 项日程` : '本月暂无安排'}
                    </span>
                    <Button variant="ghost" onClick={goToToday}>
                        <CalendarCheck size={14} />
                        回到今天
                    </Button>
                </div>
            </div>
            <p className="calendar-tip">
                <CalendarClock size={13} />
                重复任务会铺在每一次发生日上，每个日期格最多显示 3 条；滚动鼠标滚轮可快速翻月，点击任意日期可从右侧抽屉查看完整日程并直接添加、编辑或删除。
            </p>

            <CalendarDayDrawer
                date={selectedDay}
                entries={dayEntries}
                highFrequencyTasks={dayHighFrequencyTasks}
                onClose={closeCalendarDay}
                onComplete={onComplete}
                onRemove={onRemove}
                onOpen={onOpen}
            />
        </section>
    )
}
