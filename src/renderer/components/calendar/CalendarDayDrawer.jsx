import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CalendarClock, Check, Clock3, Flag, ListTree, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerLayout } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { buildDayDateTime } from '@/lib/calendar'
import { formatRecurrence, toTimeInput } from '@/lib/date'
import { openNativePicker } from '@/lib/native-picker'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'

const PRIORITY_LABELS = ['', '低', '中', '高']

function defaultAddTime(date) {
    const now = new Date()
    if (date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
        return format(now, 'HH:mm')
    }
    return '09:00'
}

function DayTaskRow({ entry, onComplete, onRemove, onOpen }) {
    const showToast = useAppStore((state) => state.showToast)
    const task = entry.task
    const editableTime = entry.kind === 'due'
    const [editing, setEditing] = useState(false)
    const [draftTitle, setDraftTitle] = useState(task.title)
    const [draftTime, setDraftTime] = useState(toTimeInput(task.dueAt) || format(entry.at, 'HH:mm'))
    const [saving, setSaving] = useState(false)
    const completed = task.status === 'completed'
    const timeLabel = entry.kind === 'remind' ? `${format(entry.at, 'HH:mm')} 提醒` : format(entry.at, 'HH:mm')

    const startEditing = () => {
        setDraftTitle(task.title)
        setDraftTime(toTimeInput(task.dueAt) || format(entry.at, 'HH:mm'))
        setEditing(true)
    }

    const cancelEditing = () => {
        setEditing(false)
        setDraftTitle(task.title)
        setDraftTime(toTimeInput(task.dueAt) || format(entry.at, 'HH:mm'))
    }

    const save = async (event) => {
        event.preventDefault()
        const title = draftTitle.trim()
        if (!title) {
            showToast('任务标题不能为空', 'error')
            return
        }
        const patch = {}
        if (title !== task.title) {
            patch.title = title
        }
        if (editableTime && draftTime && draftTime !== toTimeInput(task.dueAt)) {
            patch.dueAt = buildDayDateTime(parseISO(task.dueAt), draftTime)
        }
        if (!Object.keys(patch).length) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            await api.tasks.update(task.id, patch)
            showToast('任务已更新')
            setEditing(false)
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={`calendar-day-row${completed ? ' completed' : ''}${editing ? ' editing' : ''}`}>
            <button
                type="button"
                className={`task-check ${completed ? 'checked' : ''}`}
                onClick={() => onComplete(task)}
                aria-label={completed ? `重新打开任务：${task.title}` : `完成任务：${task.title}`}
            >
                {completed && <Check size={13} strokeWidth={3} />}
            </button>

            {editing ? (
                <form className="calendar-day-edit" onSubmit={save}>
                    <Input
                        autoFocus
                        maxLength={200}
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        aria-label={`编辑任务标题：${task.title}`}
                    />
                    {editableTime && (
                        <input
                            className="input calendar-day-edit-time"
                            type="time"
                            value={draftTime}
                            onClick={openNativePicker}
                            onChange={(event) => setDraftTime(event.target.value)}
                            aria-label="截止时间"
                        />
                    )}
                    <Button type="submit" disabled={saving}>
                        {saving ? '保存中…' : '保存'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={cancelEditing}>
                        取消
                    </Button>
                    {entry.isRecurrence ? (
                        <p className="calendar-day-edit-hint">这是重复任务的一次发生，改标题会同步整个重复序列；时间与重复规律请到任务详情中调整。</p>
                    ) : (
                        !editableTime && <p className="calendar-day-edit-hint">这一天是提醒时间，请到任务详情中调整时间。</p>
                    )}
                </form>
            ) : (
                <div className="calendar-day-main">
                    <button type="button" className="calendar-day-title" onClick={startEditing} title="点击编辑任务">
                        {task.title}
                    </button>
                    <div className="calendar-day-meta">
                        <span className="meta-item">
                            <Clock3 size={10} />
                            {timeLabel}
                        </span>
                        {task.recurrenceType !== 'none' && (
                            <span className="meta-item">
                                <Repeat2 size={10} />
                                {formatRecurrence(task.recurrenceType, task.recurrenceInterval, task.recurrenceUnit)}
                            </span>
                        )}
                        {task.categoryName && (
                            <span className="meta-item">
                                <span className="category-dot" style={{ width: 6, height: 6, background: task.categoryColor || 'hsl(var(--primary))' }} />
                                {task.categoryName}
                            </span>
                        )}
                        {task.priority > 0 && (
                            <span className={`meta-item priority-${task.priority}`}>
                                <Flag size={10} />
                                {PRIORITY_LABELS[task.priority]}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {!editing && (
                <div className="calendar-day-actions">
                    <button type="button" className="icon-button" onClick={startEditing} aria-label={`编辑任务：${task.title}`} title="编辑">
                        <Pencil size={13} />
                    </button>
                    <button type="button" className="icon-button" onClick={() => onOpen(task)} aria-label={`查看任务详情：${task.title}`} title="详情">
                        <ListTree size={13} />
                    </button>
                    <button type="button" className="icon-button danger" onClick={() => onRemove(task)} aria-label={`删除任务：${task.title}`} title="删除">
                        <Trash2 size={13} />
                    </button>
                </div>
            )}
        </div>
    )
}

export function CalendarDayDrawer({ date, entries, highFrequencyTasks, onClose, onComplete, onRemove, onOpen }) {
    const showToast = useAppStore((state) => state.showToast)
    const [draftTitle, setDraftTitle] = useState('')
    const [draftTime, setDraftTime] = useState('09:00')
    const [adding, setAdding] = useState(false)
    const inputRef = useRef(null)

    useEffect(() => {
        if (!date) {
            return undefined
        }
        setDraftTitle('')
        setDraftTime(defaultAddTime(date))
        const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
        return () => window.cancelAnimationFrame(frame)
    }, [date])

    const addTask = async (event) => {
        event.preventDefault()
        const title = draftTitle.trim()
        if (!date || !title) {
            return
        }
        setAdding(true)
        try {
            await api.tasks.create({ title, dueAt: buildDayDateTime(date, draftTime) })
            setDraftTitle('')
            showToast(`已添加到 ${format(date, 'M月d日')}`)
            inputRef.current?.focus()
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setAdding(false)
        }
    }

    const empty = entries.length === 0 && highFrequencyTasks.length === 0
    const description = entries.length
        ? `${entries.length} 项日程，点击标题即可编辑`
        : highFrequencyTasks.length
          ? '这一天只有高频重复提醒'
          : '这一天还没有安排'

    const footer = (
        <>
            <span className="drawer-footer-hint">完成、编辑与删除会立即同步到所有视图</span>
            <Button type="button" variant="secondary" onClick={onClose}>
                关闭
            </Button>
        </>
    )

    return (
        <Drawer open={Boolean(date)} onOpenChange={(next) => !next && onClose()}>
            <DrawerContent className="calendar-day-drawer" depth={1}>
                <DrawerLayout
                    title={date ? format(date, 'M月d日 EEEE', { locale: zhCN }) : '当天日程'}
                    description={description}
                    bodyClassName="calendar-day-drawer-body"
                    footer={footer}
                >
                    <form className="calendar-day-add" onSubmit={addTask}>
                        <Input
                            ref={inputRef}
                            maxLength={200}
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            placeholder="添加这一天的任务…"
                            aria-label="新任务的标题"
                        />
                        <label className="calendar-day-add-time">
                            <Clock3 size={13} />
                            <input
                                className="input"
                                type="time"
                                value={draftTime}
                                onClick={openNativePicker}
                                onChange={(event) => setDraftTime(event.target.value)}
                                aria-label="新任务的截止时间"
                            />
                        </label>
                        <Button type="submit" disabled={adding || !draftTitle.trim()}>
                            <Plus size={14} />
                            {adding ? '添加中…' : '添加'}
                        </Button>
                    </form>

                    {entries.length > 0 && (
                        <div className="calendar-day-list">
                            {entries.map((entry) => (
                                <DayTaskRow key={entry.id} entry={entry} onComplete={onComplete} onRemove={onRemove} onOpen={onOpen} />
                            ))}
                        </div>
                    )}

                    {empty && (
                        <div className="calendar-day-empty">
                            <CalendarClock size={20} />
                            <p>这一天还没有日程</p>
                            <span>在上方输入框写下要做的事，就能把它安排在{date ? format(date, 'M月d日') : '这一天'}。</span>
                        </div>
                    )}

                    {highFrequencyTasks.length > 0 && (
                        <section className="calendar-day-recurring" aria-label="高频重复提醒">
                            <div className="calendar-day-section-head">
                                <Repeat2 size={11} />
                                <span>按小时/分钟重复的提醒</span>
                                <span className="calendar-day-section-count">{highFrequencyTasks.length}</span>
                            </div>
                            <div className="calendar-day-recurring-list">
                                {highFrequencyTasks.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        className="calendar-day-recurring-item"
                                        onClick={() => onOpen(task)}
                                        title="重复频率高于按天，仅在当天详情中显示，点击查看任务详情"
                                    >
                                        <span className="calendar-day-recurring-title">{task.title}</span>
                                        <span className="calendar-day-recurring-meta">
                                            {formatRecurrence(task.recurrenceType, task.recurrenceInterval, task.recurrenceUnit)}
                                            {task.remindAt ? ` · 下次 ${format(parseISO(task.remindAt), 'M月d日 HH:mm')}` : ''}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="calendar-day-recurring-hint">这些提醒的频率高于是按天，不铺到月历上，避免同一任务占满整月。</p>
                        </section>
                    )}
                </DrawerLayout>
            </DrawerContent>
        </Drawer>
    )
}
