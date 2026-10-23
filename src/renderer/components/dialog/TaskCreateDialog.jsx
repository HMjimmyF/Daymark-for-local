import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogLayout } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/date-picker'
import { PRIORITY_OPTIONS } from '@/components/common/view-config'
import { RecurrenceFields } from '@/components/task/RecurrenceFields'
import { ReminderFields } from '@/components/task/ReminderFields'
import { buildRecurringReminderAt, fromDateInput, fromDateTimeInput } from '@/lib/date'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'

const initialForm = {
    title: '',
    description: '',
    dueAt: '',
    remindAt: '',
    recurrenceType: 'none',
    recurrenceInterval: 1,
    recurrenceUnit: 'day',
    recurrenceUntil: '',
    priority: 0,
    categoryId: ''
}

export function TaskCreateDialog({ open, categories, onClose, onCreated }) {
    const [form, setForm] = useState(initialForm)
    const [saving, setSaving] = useState(false)
    const showToast = useAppStore((state) => state.showToast)

    useEffect(() => {
        if (open) {
            setForm(initialForm)
        }
    }, [open])

    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
    const updateRecurrence = (patch) =>
        setForm((current) => {
            const next = { ...current, ...patch }
            const ruleShapeChanged = Object.hasOwn(patch, 'recurrenceType') || Object.hasOwn(patch, 'recurrenceUnit')
            if (next.recurrenceType !== 'none' && (ruleShapeChanged || !next.remindAt)) {
                next.remindAt = buildRecurringReminderAt(next)
            }
            return next
        })

    const submit = async (event) => {
        event.preventDefault()
        if (!form.title.trim()) {
            showToast('请输入任务标题', 'error')
            return
        }
        setSaving(true)
        try {
            const task = await api.tasks.create({
                title: form.title,
                description: form.description || null,
                priority: Number(form.priority),
                categoryId: form.categoryId || null,
                dueAt: fromDateTimeInput(form.dueAt),
                remindAt: fromDateTimeInput(form.remindAt),
                recurrenceType: form.recurrenceType,
                recurrenceInterval: form.recurrenceInterval,
                recurrenceUnit: form.recurrenceUnit,
                recurrenceUntil: fromDateInput(form.recurrenceUntil)
            })
            showToast('任务已添加')
            onCreated?.(task)
            onClose()
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent layout className="task-create-dialog">
                <DialogLayout
                    title="添加新任务"
                    description="先写下要做的事，再按需安排提醒、重复和截止时间。"
                    footer={
                        <>
                            <span className="task-create-required">标题为唯一必填项</span>
                            <Button type="button" variant="ghost" onClick={onClose}>
                                取消
                            </Button>
                            <Button type="submit" form="task-create-form" disabled={saving}>
                                {saving ? '正在添加…' : '添加任务'}
                            </Button>
                        </>
                    }
                >
                    <form id="task-create-form" onSubmit={submit} className="form-grid">
                        <div>
                            <Label htmlFor="new-task-title">任务标题</Label>
                            <Input
                                id="new-task-title"
                                autoFocus
                                maxLength={200}
                                value={form.title}
                                onChange={(event) => update('title', event.target.value)}
                                placeholder="接下来要做什么？"
                            />
                        </div>
                        <div>
                            <Label htmlFor="new-task-description">描述（可选）</Label>
                            <Textarea
                                id="new-task-description"
                                maxLength={5000}
                                value={form.description}
                                onChange={(event) => update('description', event.target.value)}
                                placeholder="补充上下文、链接或验收条件"
                            />
                        </div>

                        <RecurrenceFields idPrefix="new-task" value={form} onChange={updateRecurrence} />
                        <ReminderFields idPrefix="new-task" value={form} onChange={updateRecurrence} />

                        <div className="form-section due-section">
                            <div>
                                <Label htmlFor="new-task-due">完成截止时间（可选）</Label>
                                <DateTimePicker id="new-task-due" value={form.dueAt} onChange={(dueAt) => update('dueAt', dueAt)} />
                                <p className="field-hint">用于列表排序和逾期标识，不会自动发送通知。</p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div>
                                <Label htmlFor="new-task-priority">优先级</Label>
                                <select
                                    id="new-task-priority"
                                    className="select"
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
                                <Label htmlFor="new-task-category">分类</Label>
                                <select
                                    id="new-task-category"
                                    className="select"
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
                    </form>
                </DialogLayout>
            </DialogContent>
        </Dialog>
    )
}
