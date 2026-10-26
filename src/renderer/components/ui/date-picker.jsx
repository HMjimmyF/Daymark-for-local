import { useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { openNativePicker } from '../../lib/native-picker'

function dateTimeParts(value) {
    const [date = '', time = ''] = (value || '').split('T')
    return { date, time: time.slice(0, 5) }
}

export function DatePicker({ id, value, onChange, disabled = false, className = '' }) {
    return (
        <div className={`date-picker ${className}`}>
            <div className="date-picker-row">
                <input
                    id={id}
                    className="input"
                    type="date"
                    value={value || ''}
                    onClick={openNativePicker}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                />
                {value && (
                    <button type="button" onClick={() => onChange('')} disabled={disabled} className="date-picker-inline-clear">
                        清除
                    </button>
                )}
            </div>
        </div>
    )
}

export function DateTimePicker({ id, value, onChange, disabled = false, className = '' }) {
    const initialParts = dateTimeParts(value)
    const [draftDate, setDraftDate] = useState(initialParts.date)
    const [draftTime, setDraftTime] = useState(initialParts.time)
    const emittedValue = useRef(value || '')

    useEffect(() => {
        const nextValue = value || ''
        if (nextValue === emittedValue.current) {
            return
        }
        const nextParts = dateTimeParts(nextValue)
        emittedValue.current = nextValue
        setDraftDate(nextParts.date)
        setDraftTime(nextParts.time)
    }, [value])

    const clear = () => {
        emittedValue.current = ''
        onChange('')
        setDraftDate('')
        setDraftTime('')
    }

    const updateDraft = (date, time) => {
        const nextValue = date && time ? `${date}T${time}` : ''
        emittedValue.current = nextValue
        setDraftDate(date)
        setDraftTime(time)
        onChange(nextValue)
    }

    return (
        <div className={`date-picker ${className}`}>
            <div className="date-picker-grid">
                <label className="date-picker-control">
                    <span className="date-picker-control-label">日期</span>
                    <input
                        id={id}
                        className="input"
                        type="date"
                        value={draftDate}
                        onClick={openNativePicker}
                        onChange={(event) => updateDraft(event.target.value, draftTime)}
                        disabled={disabled}
                    />
                </label>
                <div className="date-picker-control">
                    <div className="date-picker-control-heading">
                        <span className="date-picker-control-label">时间</span>
                        {(draftDate || draftTime) && (
                            <button type="button" onClick={clear} disabled={disabled} className="date-picker-inline-clear">
                                清除
                            </button>
                        )}
                    </div>
                    <label className="date-picker-time">
                        <Clock3 size={14} />
                        <input
                            className="input"
                            type="time"
                            value={draftTime}
                            onClick={openNativePicker}
                            onChange={(event) => updateDraft(draftDate, event.target.value)}
                            disabled={disabled}
                        />
                    </label>
                </div>
            </div>
        </div>
    )
}
