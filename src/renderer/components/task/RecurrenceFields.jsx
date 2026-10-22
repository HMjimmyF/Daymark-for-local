import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RECURRENCE_OPTIONS } from '@/components/common/view-config'

export function RecurrenceFields({ idPrefix, value, dueAt, remindAt, onChange }) {
    const recurring = value.recurrenceType !== 'none'

    const update = (patch) => {
        onChange(patch)
    }

    const changeType = (recurrenceType) => {
        const patch = {
            recurrenceType,
            recurrenceInterval: recurrenceType === 'custom' ? value.recurrenceInterval : 1
        }
        if (recurrenceType !== 'none' && !remindAt && dueAt) {
            patch.remindAt = dueAt
        }
        onChange(patch)
    }

    return (
        <>
            <div className="form-row">
                <div>
                    <Label htmlFor={`${idPrefix}-recurrence`}>重复提醒</Label>
                    <select
                        id={`${idPrefix}-recurrence`}
                        className="native-select"
                        value={value.recurrenceType}
                        onChange={(event) => changeType(event.target.value)}
                    >
                        {RECURRENCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label htmlFor={`${idPrefix}-recurrence-until`}>结束日期</Label>
                    <Input
                        id={`${idPrefix}-recurrence-until`}
                        className="date-input"
                        type="date"
                        value={value.recurrenceUntil}
                        disabled={!recurring}
                        onChange={(event) => update({ recurrenceUntil: event.target.value })}
                    />
                </div>
            </div>
            {value.recurrenceType === 'custom' && (
                <div>
                    <Label htmlFor={`${idPrefix}-recurrence-interval`}>循环间隔</Label>
                    <Input
                        id={`${idPrefix}-recurrence-interval`}
                        type="number"
                        min="1"
                        max="365"
                        value={value.recurrenceInterval}
                        onChange={(event) => update({ recurrenceInterval: Number(event.target.value) })}
                    />
                </div>
            )}
            {recurring && !remindAt && <div className="setting-description">循环提醒还需要一个提醒时间。</div>}
        </>
    )
}
