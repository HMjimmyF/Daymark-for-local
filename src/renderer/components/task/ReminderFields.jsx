import { Bell, CalendarClock } from 'lucide-react'
import { parseISO } from 'date-fns'
import { DateTimePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildRecurringReminderAt, formatDueDate, toTimeInput } from '@/lib/date'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const MONTHS = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月']
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

function reminderBase(value) {
    const date = value.remindAt ? parseISO(value.remindAt) : new Date()
    return Number.isNaN(date.getTime()) ? new Date() : date
}

export function ReminderFields({ idPrefix, value, onChange }) {
    const recurring = value.recurrenceType !== 'none'
    const unit = value.recurrenceUnit || 'day'
    const base = reminderBase(value)
    const reminderTime = toTimeInput(value.remindAt) || toTimeInput(value.dueAt) || '09:00'

    const updateRecurringReminder = (patch) => {
        onChange({
            remindAt: buildRecurringReminderAt(value, patch)
        })
    }

    const needsDay = value.recurrenceType === 'monthly' || (value.recurrenceType === 'custom' && ['month', 'year'].includes(unit))
    const needsMonth = value.recurrenceType === 'custom' && unit === 'year'

    return (
        <section className="form-section reminder-section" aria-labelledby={`${idPrefix}-reminder-heading`}>
            <div className="form-section-heading">
                <span className="form-section-icon">
                    <Bell size={15} />
                </span>
                <div>
                    <h3 id={`${idPrefix}-reminder-heading`} className="form-section-title">
                        提醒时间
                    </h3>
                    <p className="form-section-description">{recurring ? '重复提醒从这个时间开始安排下一次。' : '只提一次，不设置就不发送通知。'}</p>
                </div>
            </div>

            {!recurring ? (
                <div>
                    <Label htmlFor={`${idPrefix}-remind`}>日期与时间</Label>
                    <DateTimePicker id={`${idPrefix}-remind`} value={value.remindAt} onChange={(remindAt) => onChange({ remindAt })} />
                    <p className="field-hint">选择完整日期和时间后立即生效。</p>
                </div>
            ) : (
                <>
                    <div className={`reminder-pattern-grid ${needsMonth ? 'with-month' : ''}`}>
                        {value.recurrenceType === 'weekly' && (
                            <div>
                                <Label htmlFor={`${idPrefix}-reminder-weekday`}>每周几</Label>
                                <select
                                    id={`${idPrefix}-reminder-weekday`}
                                    className="select"
                                    value={base.getDay()}
                                    onChange={(event) => updateRecurringReminder({ reminderWeekday: Number(event.target.value) })}
                                >
                                    {WEEKDAYS.map((label, index) => (
                                        <option key={label} value={index}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needsMonth && (
                            <div>
                                <Label htmlFor={`${idPrefix}-reminder-month`}>月份</Label>
                                <select
                                    id={`${idPrefix}-reminder-month`}
                                    className="select"
                                    value={base.getMonth()}
                                    onChange={(event) => updateRecurringReminder({ reminderMonth: Number(event.target.value) })}
                                >
                                    {MONTHS.map((label, index) => (
                                        <option key={label} value={index}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needsDay && (
                            <div>
                                <Label htmlFor={`${idPrefix}-reminder-day`}>
                                    {value.recurrenceType === 'monthly' || unit === 'month' ? '每月几号' : '日期'}
                                </Label>
                                <select
                                    id={`${idPrefix}-reminder-day`}
                                    className="select"
                                    value={base.getDate()}
                                    onChange={(event) => updateRecurringReminder({ reminderDay: Number(event.target.value) })}
                                >
                                    {MONTH_DAYS.map((day) => (
                                        <option key={day} value={day}>
                                            {day} 日
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <Label htmlFor={`${idPrefix}-reminder-time`}>提醒时刻</Label>
                            <Input
                                id={`${idPrefix}-reminder-time`}
                                type="time"
                                value={reminderTime}
                                onChange={(event) => updateRecurringReminder({ reminderTime: event.target.value })}
                            />
                        </div>
                    </div>
                    <div className="schedule-summary">
                        <CalendarClock size={13} />
                        <span>下一次提醒：{value.remindAt ? formatDueDate(value.remindAt) : '待设置'}</span>
                    </div>
                </>
            )}
        </section>
    )
}
