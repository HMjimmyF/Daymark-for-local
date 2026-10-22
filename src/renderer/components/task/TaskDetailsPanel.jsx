import { useEffect, useState } from 'react'
import { Bell, CalendarClock, Check, CheckCircle2, Plus, Repeat2, RotateCcw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PRIORITY_OPTIONS } from '@/components/common/view-config'
import { RecurrenceFields } from '@/components/task/RecurrenceFields'
import { formatRecurrence, fromDateInput, fromDateTimeInput, toDateInput, toDateTimeInput } from '@/lib/date'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'
import { useTaskDetail } from '@/hooks/use-app-data'

function formFromTask(task) {
    return {
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        categoryId: task.categoryId || '',
        dueAt: toDateTimeInput(task.dueAt),
        remindAt: toDateTimeInput(task.remindAt),
        recurrenceType: task.recurrenceType || 'none',
        recurrenceInterval: task.recurrenceInterval || 1,
        recurrenceUntil: toDateInput(task.recurrenceUntil)
    }
}

export function TaskDetailsPanel({ taskId, categories }) {
    const { task, loading, reload } = useTaskDetail(taskId)
    const [form, setForm] = useState(null)
    const [draft, setDraft] = useState('')
    const [saving, setSaving] = useState(false)
    const closeTask = useAppStore((state) => state.closeTask)
    const openTask = useAppStore((state) => state.openTask)
    const showToast = useAppStore((state) => state.showToast)

    useEffect(() => {
        if (task) {
            setForm(formFromTask(task))
        }
    }, [task])

    if (loading && !task) {
        return (
            <aside className="details-panel">
                <div className="details-header">
                    <div className="skeleton-line" style={{ width: 90 }} />
                    <button type="button" className="icon-button" onClick={closeTask} aria-label="关闭详情">
                        <X size={16} />
                    </button>
                </div>
                <div className="details-body">
                    <div className="skeleton-line" style={{ width: '80%', height: 18 }} />
                    <div className="skeleton-line" style={{ width: '55%', marginTop: 22 }} />
                    <div className="skeleton-line" style={{ width: '66%', marginTop: 12 }} />
                </div>
            </aside>
        )
    }

    if (!task || !form) {
        return (
            <aside className="details-panel">
                <div className="details-header">
                    <span className="details-eyebrow">任务详情</span>
                    <button type="button" className="icon-button" onClick={closeTask} aria-label="关闭详情">
                        <X size={16} />
                    </button>
                </div>
                <div className="details-body">
                    <p className="empty-copy">这个任务已不存在，可能被其他操作删除了。</p>
                </div>
            </aside>
        )
    }

    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
    const updateRecurrence = (patch) => setForm((current) => ({ ...current, ...patch }))
    const dirty =
        form.title !== task.title ||
        form.description !== (task.description || '') ||
        Number(form.priority) !== task.priority ||
        (form.categoryId || null) !== task.categoryId ||
        (form.dueAt || null) !== toDateTimeInput(task.dueAt) ||
        (form.remindAt || null) !== toDateTimeInput(task.remindAt) ||
        form.recurrenceType !== (task.recurrenceType || 'none') ||
        Number(form.recurrenceInterval) !== (task.recurrenceInterval || 1) ||
        (form.recurrenceUntil || null) !== toDateInput(task.recurrenceUntil)

    const save = async () => {
        if (!form.title.trim()) {
            showToast('任务标题不能为空', 'error')
            return
        }
        setSaving(true)
        try {
            await api.tasks.update(task.id, {
                title: form.title,
                description: form.description || null,
                priority: Number(form.priority),
                categoryId: form.categoryId || null,
                dueAt: fromDateTimeInput(form.dueAt),
                remindAt: fromDateTimeInput(form.remindAt),
                recurrenceType: form.recurrenceType,
                recurrenceInterval: Number(form.recurrenceInterval),
                recurrenceUntil: fromDateInput(form.recurrenceUntil)
            })
            showToast('修改已保存')
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    const toggleComplete = async () => {
        try {
            if (task.status === 'completed') {
                await api.tasks.reopen(task.id)
                showToast('任务已重新打开')
            } else {
                await api.tasks.complete(task.id)
                showToast('任务已完成')
            }
            reload()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const remove = async () => {
        if (!window.confirm(`确定删除“${task.title}”吗？任务会从当前列表中移除。`)) {
            return
        }
        try {
            await api.tasks.remove(task.id)
            showToast('任务已删除')
            closeTask()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const toggleChild = async (child) => {
        try {
            if (child.status === 'completed') {
                await api.tasks.reopen(child.id)
            } else {
                await api.tasks.complete(child.id)
            }
            reload()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const addChild = async (event) => {
        event.preventDefault()
        if (!draft.trim()) {
            return
        }
        try {
            await api.tasks.create({
                title: draft,
                parentId: task.id,
                categoryId: task.categoryId,
                dueAt: task.dueAt,
                priority: task.priority
            })
            setDraft('')
            showToast('子任务已添加')
            reload()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    return (
        <aside className="details-panel" aria-label="任务详情">
            <div className="details-header">
                <span className="details-eyebrow">{task.parentId ? '子任务详情' : task.status === 'completed' ? '已完成任务' : '任务详情'}</span>
                <button type="button" className="icon-button" onClick={closeTask} aria-label="关闭详情">
                    <X size={16} />
                </button>
            </div>
            <div className="details-body">
                <textarea
                    className="details-title-input"
                    value={form.title}
                    maxLength={200}
                    onChange={(event) => update('title', event.target.value)}
                    aria-label="任务标题"
                />
                <textarea
                    className="details-description"
                    value={form.description}
                    maxLength={5000}
                    onChange={(event) => update('description', event.target.value)}
                    placeholder="添加描述…"
                    aria-label="任务描述"
                />
                <hr className="details-divider" />

                <div className="field-grid">
                    <div>
                        <Label htmlFor="detail-due">截止时间</Label>
                        <Input
                            id="detail-due"
                            className="date-input"
                            type="datetime-local"
                            value={form.dueAt}
                            onChange={(event) => update('dueAt', event.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="detail-remind">提醒时间</Label>
                        <Input
                            id="detail-remind"
                            className="date-input"
                            type="datetime-local"
                            value={form.remindAt}
                            onChange={(event) => update('remindAt', event.target.value)}
                        />
                    </div>
                    <RecurrenceFields idPrefix="detail" value={form} dueAt={form.dueAt} remindAt={form.remindAt} onChange={updateRecurrence} />
                    <div className="form-row">
                        <div>
                            <Label htmlFor="detail-priority">优先级</Label>
                            <select
                                id="detail-priority"
                                className="native-select"
                                value={form.priority}
                                onChange={(event) => update('priority', event.target.value)}
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="detail-category">分类</Label>
                            <select
                                id="detail-category"
                                className="native-select"
                                value={form.categoryId}
                                onChange={(event) => update('categoryId', event.target.value)}
                            >
                                <option value="">无分类</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="details-actions">
                    <Button variant="secondary" onClick={toggleComplete}>
                        {task.status === 'completed' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                        {task.status === 'completed' ? '重新打开' : '完成'}
                    </Button>
                    <Button onClick={save} disabled={!dirty || saving}>
                        {saving ? '保存中…' : '保存修改'}
                    </Button>
                </div>

                {!task.parentId && (
                    <div className="subtask-section">
                        <div className="subtask-heading">
                            <span>子任务 {task.children?.length ? `· ${task.children.length}` : ''}</span>
                            <Check size={13} color="hsl(var(--subtle-foreground))" />
                        </div>
                        {task.children?.map((child) => (
                            <div className="subtask-row" key={child.id}>
                                <button
                                    type="button"
                                    className={`task-check ${child.status === 'completed' ? 'checked' : ''}`}
                                    onClick={() => toggleChild(child)}
                                    aria-label={`切换子任务：${child.title}`}
                                >
                                    {child.status === 'completed' && <Check size={12} strokeWidth={3} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openTask(child.id)}
                                    style={{ textDecoration: child.status === 'completed' ? 'line-through' : 'none' }}
                                >
                                    {child.title}
                                </button>
                            </div>
                        ))}
                        <form className="subtask-add" onSubmit={addChild}>
                            <Input
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                placeholder="添加子任务…"
                                maxLength={200}
                                aria-label="子任务标题"
                            />
                            <Button variant="secondary" size="icon" type="submit" aria-label="添加子任务">
                                <Plus size={15} />
                            </Button>
                        </form>
                    </div>
                )}

                <hr className="details-divider" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 10 }}>
                        {task.remindAt && (
                            <span className="meta-item">
                                {task.recurrenceType !== 'none' ? <Repeat2 size={10} /> : <Bell size={10} />}
                                {task.recurrenceType !== 'none'
                                    ? `${formatRecurrence(task.recurrenceType, task.recurrenceInterval)}循环提醒将在应用运行时发送`
                                    : '提醒将在应用运行时发送'}
                            </span>
                        )}
                        {!task.remindAt && task.dueAt && (
                            <span className="meta-item">
                                <CalendarClock size={10} /> 截止时间已设置
                            </span>
                        )}
                    </div>
                    <Button variant="ghost" onClick={remove} aria-label="删除任务" style={{ color: 'hsl(var(--danger))' }}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            </div>
        </aside>
    )
}
