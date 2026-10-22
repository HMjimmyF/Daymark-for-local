import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CornerDownLeft, X } from 'lucide-react'
import brandIcon from '@brand/brand-icon.svg'
import { Button } from '@/components/ui/button'
import { api } from '@/services/daymark'
import { dateAt, fromDateTimeInput, toDateTimeInput } from '@/lib/date'
import { useTheme } from '@/hooks/use-theme'
import { useAppStore } from '@/stores/app-store'

export function QuickAddApp() {
    const [title, setTitle] = useState('')
    const [dueAt, setDueAt] = useState(toDateTimeInput(dateAt(18)))
    const [categoryId, setCategoryId] = useState('')
    const [categories, setCategories] = useState([])
    const [theme, setTheme] = useState('system')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef(null)
    const showToast = useAppStore((state) => state.showToast)

    useEffect(() => {
        inputRef.current?.focus()
        Promise.all([api.categories.list(), api.settings.get()])
            .then(([nextCategories, settings]) => {
                setCategories(nextCategories)
                setTheme(settings.theme)
            })
            .catch(() => setCategories([]))
    }, [])

    useTheme(theme)

    const close = () => api.windows.hideQuickAdd()

    const save = async () => {
        if (!title.trim()) {
            setError('请输入任务标题')
            inputRef.current?.focus()
            return
        }
        setSaving(true)
        setError('')
        try {
            await api.tasks.create({
                title,
                dueAt: fromDateTimeInput(dueAt),
                categoryId: categoryId || null,
                priority: 0
            })
            showToast('任务已添加到日序')
            setTitle('')
            await close()
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="quick-add-root">
            <div className="quick-add-bar">
                <div className="quick-add-title">
                    <img src={brandIcon} width="18" height="18" alt="" className="brand-mark mini" />
                    快速添加
                </div>
                <button type="button" className="icon-button" style={{ width: 29, height: 29 }} onClick={close} aria-label="关闭快速添加">
                    <X size={16} />
                </button>
            </div>
            <div className="quick-add-body">
                <textarea
                    ref={inputRef}
                    className="quick-add-input"
                    value={title}
                    maxLength={200}
                    onChange={(event) => {
                        setTitle(event.target.value)
                        setError('')
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            save()
                        }
                        if (event.key === 'Escape') {
                            close()
                        }
                    }}
                    placeholder="记下一件要做的事…"
                    aria-label="快速添加任务标题"
                />
                <div className="quick-add-fields">
                    <label>
                        <span className="field-label">完成截止</span>
                        <input
                            className="date-input"
                            type="datetime-local"
                            value={dueAt}
                            onChange={(event) => setDueAt(event.target.value)}
                            aria-label="完成截止时间"
                        />
                    </label>
                    <label>
                        <span className="field-label">分类</span>
                        <select className="native-select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="任务分类">
                            <option value="">无分类</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="quick-add-footer">
                    <span className="quick-add-hint" style={{ color: error ? 'hsl(var(--danger))' : undefined }}>
                        {error || (
                            <>
                                <CalendarDays size={10} style={{ display: 'inline', marginRight: 4 }} />
                                Enter 保存 · Esc 关闭
                            </>
                        )}
                    </span>
                    <Button onClick={save} disabled={saving}>
                        {saving ? '添加中…' : '添加到日序'}
                        <CornerDownLeft size={13} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
