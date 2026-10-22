import { useState } from 'react'
import { CalendarDays, Check, ChevronDown, Clock3 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

function readableDate(value) {
    if (!value) {
        return ''
    }
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? '' : format(date, 'yyyy年M月d日', { locale: zhCN })
}

function readableDateTime(value) {
    if (!value) {
        return ''
    }
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? '' : format(date, 'yyyy年M月d日 HH:mm', { locale: zhCN })
}

function PickerActions({ canConfirm, onCancel, onClear, onConfirm }) {
    return (
        <div className="date-picker-actions">
            <Button variant="ghost" onClick={onClear}>
                清除
            </Button>
            <span className="date-picker-actions-spacer" />
            <Button variant="secondary" onClick={onCancel}>
                取消
            </Button>
            <Button onClick={onConfirm} disabled={!canConfirm}>
                <Check size={13} />
                确定
            </Button>
        </div>
    )
}

export function DatePicker({ id, value, onChange, disabled = false, placeholder = '选择日期', className = '' }) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(value || '')

    const showPanel = () => {
        if (disabled) {
            return
        }
        setDraft(value || '')
        setOpen(true)
    }

    const clear = () => {
        onChange('')
        setDraft('')
        setOpen(false)
    }

    const confirm = () => {
        onChange(draft)
        setOpen(false)
    }

    return (
        <div className={`date-picker ${className}`}>
            <button
                id={id}
                type="button"
                className={`date-picker-trigger ${open ? 'open' : ''}`}
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : showPanel())}
                disabled={disabled}
            >
                <CalendarDays size={15} />
                <span className={value ? '' : 'placeholder'}>{readableDate(value) || placeholder}</span>
                <ChevronDown size={14} className="date-picker-chevron" />
            </button>
            {open && (
                <div className="date-picker-panel">
                    <label className="date-picker-control">
                        <span>日期</span>
                        <input className="input" type="date" value={draft} onChange={(event) => setDraft(event.target.value)} />
                    </label>
                    <div className="date-picker-summary">{draft ? `已选择 ${readableDate(draft)}` : '选择日期后点击“确定”'}</div>
                    <PickerActions canConfirm={Boolean(draft)} onCancel={() => setOpen(false)} onClear={clear} onConfirm={confirm} />
                </div>
            )}
        </div>
    )
}

export function DateTimePicker({ id, value, onChange, disabled = false, placeholder = '选择日期和时间', className = '' }) {
    const [open, setOpen] = useState(false)
    const [draftDate, setDraftDate] = useState('')
    const [draftTime, setDraftTime] = useState('')

    const showPanel = () => {
        if (disabled) {
            return
        }
        const [date = '', time = ''] = (value || '').split('T')
        setDraftDate(date)
        setDraftTime(time.slice(0, 5))
        setOpen(true)
    }

    const clear = () => {
        onChange('')
        setDraftDate('')
        setDraftTime('')
        setOpen(false)
    }

    const confirm = () => {
        onChange(`${draftDate}T${draftTime}`)
        setOpen(false)
    }

    return (
        <div className={`date-picker ${className}`}>
            <button
                id={id}
                type="button"
                className={`date-picker-trigger ${open ? 'open' : ''}`}
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : showPanel())}
                disabled={disabled}
            >
                <CalendarDays size={15} />
                <span className={value ? '' : 'placeholder'}>{readableDateTime(value) || placeholder}</span>
                <ChevronDown size={14} className="date-picker-chevron" />
            </button>
            {open && (
                <div className="date-picker-panel">
                    <div className="date-picker-grid">
                        <label className="date-picker-control">
                            <span>日期</span>
                            <input className="input" type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} />
                        </label>
                        <label className="date-picker-control">
                            <span>时间</span>
                            <span className="date-picker-time">
                                <Clock3 size={14} />
                                <input className="input" type="time" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} />
                            </span>
                        </label>
                    </div>
                    <div className="date-picker-summary">
                        {draftDate && draftTime ? `已选择 ${readableDateTime(`${draftDate}T${draftTime}`)}` : '选择日期和时间后点击“确定”'}
                    </div>
                    <PickerActions canConfirm={Boolean(draftDate && draftTime)} onCancel={() => setOpen(false)} onClear={clear} onConfirm={confirm} />
                </div>
            )}
        </div>
    )
}
