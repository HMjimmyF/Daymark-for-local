import { Repeat2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RECURRENCE_OPTIONS } from '@/components/common/view-config'

const CUSTOM_UNITS = [
    { value: 'day', label: '天' },
    { value: 'month', label: '个月' },
    { value: 'year', label: '年' }
]

export function RecurrenceFields({ idPrefix, value, onChange }) {
    const recurring = value.recurrenceType !== 'none'
    const custom = value.recurrenceType === 'custom'

    return (
        <section className="form-section recurrence-section" aria-labelledby={`${idPrefix}-recurrence-heading`}>
            <div className="form-section-heading">
                <span className="form-section-icon">
                    <Repeat2 size={15} />
                </span>
                <div>
                    <h3 id={`${idPrefix}-recurrence-heading`} className="form-section-title">
                        重复提醒
                    </h3>
                    <p className="form-section-description">“仅提醒一次”不会自动重复；选择其他周期后，到点会通知并安排下一次。</p>
                </div>
            </div>

            <div>
                <Label htmlFor={`${idPrefix}-recurrence`}>重复方式</Label>
                <select
                    id={`${idPrefix}-recurrence`}
                    className="select"
                    value={value.recurrenceType}
                    onChange={(event) => onChange({ recurrenceType: event.target.value, recurrenceInterval: 1, recurrenceUnit: 'day' })}
                >
                    {RECURRENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {custom && (
                <div>
                    <Label htmlFor={`${idPrefix}-recurrence-interval`}>自定义间隔</Label>
                    <div className="interval-editor">
                        <span>每</span>
                        <Input
                            id={`${idPrefix}-recurrence-interval`}
                            type="number"
                            min="1"
                            max="365"
                            value={value.recurrenceInterval}
                            onChange={(event) => onChange({ recurrenceInterval: Number(event.target.value) })}
                        />
                        <select
                            className="select"
                            value={value.recurrenceUnit || 'day'}
                            aria-label="循环间隔单位"
                            onChange={(event) => onChange({ recurrenceUnit: event.target.value })}
                        >
                            {CUSTOM_UNITS.map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                    {unit.label}
                                </option>
                            ))}
                        </select>
                        <span>提醒一次</span>
                    </div>
                </div>
            )}

            {recurring && (
                <div>
                    <Label htmlFor={`${idPrefix}-recurrence-until`}>重复截止日期（可选）</Label>
                    <DatePicker
                        id={`${idPrefix}-recurrence-until`}
                        value={value.recurrenceUntil}
                        onChange={(recurrenceUntil) => onChange({ recurrenceUntil })}
                    />
                    <p className="field-hint">最后一天仍会提醒，之后自动停止。留空表示一直重复。</p>
                </div>
            )}
        </section>
    )
}
