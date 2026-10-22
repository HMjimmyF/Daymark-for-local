import { useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CATEGORY_COLORS } from '@/components/common/view-config'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'

export function CategoryManagerDialog({ open, categories, onClose, onChanged }) {
    const [name, setName] = useState('')
    const [edits, setEdits] = useState({})
    const [busy, setBusy] = useState(false)
    const showToast = useAppStore((state) => state.showToast)

    useEffect(() => {
        if (open) {
            setEdits(Object.fromEntries(categories.map((category) => [category.id, { name: category.name, color: category.color || CATEGORY_COLORS[0] }])))
            setName('')
        }
    }, [open, categories])

    const create = async (event) => {
        event.preventDefault()
        if (!name.trim()) {
            return
        }
        setBusy(true)
        try {
            await api.categories.create({ name, color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] })
            setName('')
            showToast('分类已创建')
            onChanged()
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setBusy(false)
        }
    }

    const save = async (category) => {
        const next = edits[category.id]
        if (!next?.name.trim()) {
            showToast('分类名称不能为空', 'error')
            return
        }
        try {
            await api.categories.update(category.id, { name: next.name, color: next.color })
            showToast('分类已更新')
            onChanged()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const remove = async (category) => {
        if (!window.confirm(`删除“${category.name}”分类？分类中的任务会保留，并移入收集箱。`)) {
            return
        }
        try {
            const result = await api.categories.remove(category.id)
            showToast(`分类已删除，${result.movedTasks} 项任务已移入收集箱`)
            onChanged()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <div className="dialog-header">
                    <div>
                        <DialogTitle className="dialog-title">管理分类</DialogTitle>
                        <DialogDescription className="dialog-description">删除分类时，任务不会被删除，只会回到收集箱。</DialogDescription>
                    </div>
                </div>
                <form className="subtask-add" onSubmit={create} style={{ marginTop: 0 }}>
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="新分类名称" maxLength={40} aria-label="新分类名称" />
                    <Button type="submit" disabled={busy}>
                        <Plus size={14} />
                        添加
                    </Button>
                </form>
                <div className="category-list">
                    {categories.map((category) => {
                        const edit = edits[category.id] || { name: category.name, color: category.color || CATEGORY_COLORS[0] }
                        return (
                            <div className="category-editor" key={category.id}>
                                <input
                                    type="color"
                                    className="color-swatch"
                                    value={edit.color}
                                    aria-label={`${category.name} 的颜色`}
                                    onChange={(event) => setEdits((current) => ({ ...current, [category.id]: { ...edit, color: event.target.value } }))}
                                />
                                <input
                                    className="mini-input"
                                    value={edit.name}
                                    maxLength={40}
                                    aria-label={`${category.name} 的名称`}
                                    onChange={(event) => setEdits((current) => ({ ...current, [category.id]: { ...edit, name: event.target.value } }))}
                                />
                                <button
                                    type="button"
                                    className="icon-button"
                                    style={{ width: 28, height: 28 }}
                                    onClick={() => save(category)}
                                    aria-label={`保存分类 ${category.name}`}
                                    disabled={edit.name === category.name && edit.color === (category.color || CATEGORY_COLORS[0])}
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="icon-button"
                                    style={{ width: 28, height: 28, color: 'hsl(var(--danger))' }}
                                    onClick={() => remove(category)}
                                    aria-label={`删除分类 ${category.name}`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )
                    })}
                    {!categories.length && (
                        <p className="empty-copy" style={{ textAlign: 'center', margin: '14px 0' }}>
                            还没有分类。用分类组织不同领域的任务。
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
