import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CalendarRange, CheckCircle2, Inbox, ListTodo, MoreHorizontal, Pencil, Plus, Settings, SlidersHorizontal, Trash2 } from 'lucide-react'
import brandIcon from '@brand/brand-icon.svg'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'

const primaryViews = [
    { id: 'today', label: '今天', icon: CalendarDays, shortcut: '1' },
    { id: 'upcoming', label: '未来 7 天', icon: CalendarRange, shortcut: '2' },
    { id: 'inbox', label: '收集箱', icon: Inbox, shortcut: '3' },
    { id: 'all', label: '全部待办', icon: ListTodo, shortcut: '4' },
    { id: 'completed', label: '已完成', icon: CheckCircle2, shortcut: '5' }
]

export function Sidebar({ categories, counts }) {
    const activeView = useAppStore((state) => state.activeView)
    const categoryId = useAppStore((state) => state.categoryId)
    const navigate = useAppStore((state) => state.navigate)
    const setCategoryManagerOpen = useAppStore((state) => state.setCategoryManagerOpen)

    return (
        <aside className="sidebar" aria-label="主导航">
            <div className="brand">
                <img className="brand-mark" src={brandIcon} width="32" height="32" alt="" />
                <div className="brand-copy">
                    <div className="brand-name">日序</div>
                    <div className="brand-tagline">DAYMARK</div>
                </div>
            </div>

            <nav className="nav-section" aria-label="任务视图">
                <div className="nav-heading">
                    <span>工作台</span>
                </div>
                {primaryViews.map(({ id, label, icon: Icon }) => (
                    <button
                        type="button"
                        key={id}
                        className={`nav-item ${activeView === id ? 'active' : ''}`}
                        onClick={() => navigate(id)}
                        aria-current={activeView === id ? 'page' : undefined}
                    >
                        <Icon size={16} strokeWidth={1.9} />
                        <span className="nav-label">{label}</span>
                        {counts[id] > 0 && <span className="nav-count">{counts[id]}</span>}
                    </button>
                ))}
            </nav>

            <nav className="nav-section category-nav" aria-label="分类">
                <div className="nav-heading">
                    <span>分类</span>
                    <button
                        type="button"
                        className="icon-button"
                        style={{ width: 25, height: 25 }}
                        onClick={() => setCategoryManagerOpen(true)}
                        aria-label={categories.length ? '管理分类' : '新建分类'}
                    >
                        {categories.length ? <SlidersHorizontal size={14} /> : <Plus size={14} />}
                    </button>
                </div>
                <div className="sidebar-scroll">
                    {categories.map((category) => (
                        <CategoryNavItem
                            key={category.id}
                            category={category}
                            active={activeView === 'category' && categoryId === category.id}
                            onNavigate={() => navigate('category', category.id)}
                            onRemoved={() => {
                                if (activeView === 'category' && categoryId === category.id) {
                                    navigate('inbox')
                                }
                            }}
                        />
                    ))}
                    {!categories.length && (
                        <button type="button" className="nav-item" onClick={() => setCategoryManagerOpen(true)}>
                            <Plus size={14} />
                            <span className="nav-label">新建第一个分类</span>
                        </button>
                    )}
                </div>
            </nav>

            <div className="sidebar-footer">
                <button type="button" className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}>
                    <Settings size={16} strokeWidth={1.9} />
                    <span className="nav-label">设置与数据</span>
                </button>
            </div>
        </aside>
    )
}

function CategoryNavItem({ category, active, onNavigate, onRemoved }) {
    const showToast = useAppStore((state) => state.showToast)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(category.name)
    const inputRef = useRef(null)
    const cancelRef = useRef(false)
    const holdFocusRef = useRef(false)

    useEffect(() => {
        if (!editing) {
            setDraft(category.name)
            return
        }
        // 等下拉菜单关闭并归还焦点后再聚焦输入框
        const frame = window.requestAnimationFrame(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
        })
        return () => window.cancelAnimationFrame(frame)
    }, [editing, category.name])

    const startRename = () => {
        cancelRef.current = false
        holdFocusRef.current = true
        setDraft(category.name)
        setEditing(true)
    }

    const handleMenuCloseAutoFocus = (event) => {
        // 进入重命名时由输入框接管焦点，避免菜单关闭后把焦点还给已移除的按钮
        if (holdFocusRef.current) {
            holdFocusRef.current = false
            event.preventDefault()
        }
    }

    const commitRename = async () => {
        setEditing(false)
        const nextName = draft.trim()
        if (!nextName) {
            showToast('分类名称不能为空', 'error')
            return
        }
        if (nextName === category.name) {
            return
        }
        try {
            await api.categories.update(category.id, { name: nextName, color: category.color })
            showToast('分类已重命名')
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const handleBlur = () => {
        if (cancelRef.current) {
            cancelRef.current = false
            setEditing(false)
            return
        }
        commitRename()
    }

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            cancelRef.current = true
            event.currentTarget.blur()
        }
    }

    const removeCategory = async () => {
        if (!window.confirm(`删除“${category.name}”分类？分类中的任务会保留，并移入收集箱。`)) {
            return
        }
        try {
            const result = await api.categories.remove(category.id)
            showToast(`分类已删除，${result.movedTasks} 项任务已移入收集箱`)
            onRemoved()
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    if (editing) {
        return (
            <div className={`nav-item category-item editing ${active ? 'active' : ''}`}>
                <span className="category-dot" style={{ background: category.color || 'hsl(var(--primary))' }} />
                <input
                    ref={inputRef}
                    className="category-rename-input"
                    value={draft}
                    maxLength={40}
                    aria-label={`重命名分类 ${category.name}`}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
            </div>
        )
    }

    return (
        <div className={`nav-item category-item ${active ? 'active' : ''}`}>
            <button type="button" className="category-link" onClick={onNavigate} aria-current={active ? 'page' : undefined}>
                <span className="category-dot" style={{ background: category.color || 'hsl(var(--primary))' }} />
                <span className="nav-label">{category.name}</span>
            </button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" className="icon-button category-more" aria-label={`${category.name} 的更多操作`}>
                        <MoreHorizontal size={15} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onCloseAutoFocus={handleMenuCloseAutoFocus}>
                    <DropdownMenuItem onSelect={startRename}>
                        <Pencil size={14} />
                        重命名
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="danger" onSelect={removeCategory}>
                        <Trash2 size={14} />
                        删除分类
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
