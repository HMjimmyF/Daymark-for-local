import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogLayout } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CATEGORY_COLORS } from '@/components/common/view-config'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'

export function CategoryManagerDialog({ open, categories, onClose, onChanged }) {
    const [name, setName] = useState('')
    const [edits, setEdits] = useState({})
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState(false)
    const showToast = useAppStore((state) => state.showToast)
    const activeView = useAppStore((state) => state.activeView)
    const categoryId = useAppStore((state) => state.categoryId)
    const navigate = useAppStore((state) => state.navigate)
    const editsRef = useRef(edits)
    const openedRef = useRef(false)
    const nameInputRef = useRef(null)

    useEffect(() => {
        editsRef.current = edits
    }, [edits])

    useEffect(() => {
        if (!open) {
            openedRef.current = false
            setEditingId(null)
            return
        }
        const justOpened = !openedRef.current
        openedRef.current = true
        setName('')
        if (justOpened) {
            setEditingId(null)
        }
        // 打开时重新同步，之后只补充新分类，避免刷新列表覆盖正在输入的草稿
        setEdits((current) =>
            Object.fromEntries(
                categories.map((category) => [
                    category.id,
                    !justOpened && current[category.id] ? current[category.id] : { name: category.name, color: category.color || CATEGORY_COLORS[0] }
                ])
            )
        )
    }, [open, categories])

    useEffect(() => {
        if (!editingId) {
            return
        }
        const frame = window.requestAnimationFrame(() => {
            nameInputRef.current?.focus()
            nameInputRef.current?.select()
        })
        return () => window.cancelAnimationFrame(frame)
    }, [editingId])

    const updateEdit = (category, patch) => {
        const current = editsRef.current
        const next = {
            ...current,
            [category.id]: {
                ...(current[category.id] || { name: category.name, color: category.color || CATEGORY_COLORS[0] }),
                ...patch
            }
        }
        editsRef.current = next
        setEdits(next)
    }

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

    const commit = async (category) => {
        const next = editsRef.current[category.id]
        if (!next) {
            return
        }
        const originalColor = category.color || CATEGORY_COLORS[0]
        const nextName = next.name.trim()
        if (!nextName) {
            updateEdit(category, { name: category.name })
            showToast('分类名称不能为空', 'error')
            return
        }
        if (nextName === category.name && next.color === originalColor) {
            return
        }
        try {
            await api.categories.update(category.id, { name: nextName, color: next.color })
            updateEdit(category, { name: nextName })
            showToast('分类已更新')
            onChanged()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const startEdit = (category) => {
        updateEdit(category, { name: editsRef.current[category.id]?.name ?? category.name })
        setEditingId(category.id)
    }

    const cancelEdit = (category) => {
        updateEdit(category, { name: category.name })
        setEditingId(null)
    }

    const finishEdit = (category) => {
        setEditingId(null)
        commit(category)
    }

    const handleNameKeyDown = (event, category) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit(category)
        }
    }

    const remove = async (category) => {
        if (!window.confirm(`删除“${category.name}”分类？分类中的任务会保留，并移入收集箱。`)) {
            return
        }
        try {
            const result = await api.categories.remove(category.id)
            showToast(`分类已删除，${result.movedTasks} 项任务已移入收集箱`)
            if (activeView === 'category' && categoryId === category.id) {
                navigate('inbox')
            }
            onChanged()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent layout>
                <DialogLayout title="管理分类" description="删除分类时，任务不会被删除，只会回到收集箱。">
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
                            const editing = editingId === category.id
                            return (
                                <div className={`category-editor${editing ? ' editing' : ''}`} key={category.id}>
                                    <input
                                        type="color"
                                        className="color-swatch"
                                        value={edit.color}
                                        aria-label={`${category.name} 的颜色`}
                                        onChange={(event) => updateEdit(category, { color: event.target.value })}
                                        onBlur={() => commit(category)}
                                    />
                                    {editing ? (
                                        <input
                                            ref={nameInputRef}
                                            className="mini-input"
                                            value={edit.name}
                                            maxLength={40}
                                            aria-label={`${category.name} 的名称`}
                                            onChange={(event) => updateEdit(category, { name: event.target.value })}
                                            onBlur={() => finishEdit(category)}
                                            onKeyDown={(event) => handleNameKeyDown(event, category)}
                                        />
                                    ) : (
                                        <span className="category-name">{edit.name}</span>
                                    )}
                                    <div className="category-actions">
                                        <button
                                            type="button"
                                            className="icon-button"
                                            tabIndex={editing ? -1 : undefined}
                                            onClick={() => startEdit(category)}
                                            aria-label={`重命名分类 ${category.name}`}
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            tabIndex={editing ? -1 : undefined}
                                            style={{ color: 'hsl(var(--danger))' }}
                                            onClick={() => remove(category)}
                                            aria-label={`删除分类 ${category.name}`}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        {!categories.length && (
                            <p className="empty-copy" style={{ textAlign: 'center', margin: '14px 0' }}>
                                还没有分类。用分类组织不同领域的任务。
                            </p>
                        )}
                    </div>
                </DialogLayout>
            </DialogContent>
        </Dialog>
    )
}
