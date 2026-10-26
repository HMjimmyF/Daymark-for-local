import { CalendarDays, CalendarRange, CheckCircle2, Inbox, ListTodo, Plus, Settings } from 'lucide-react'
import brandIcon from '@brand/brand-icon.svg'
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
                        aria-label="管理分类"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div className="sidebar-scroll">
                    {categories.map((category) => (
                        <button
                            type="button"
                            key={category.id}
                            className={`nav-item ${activeView === 'category' && categoryId === category.id ? 'active' : ''}`}
                            onClick={() => navigate('category', category.id)}
                        >
                            <span className="category-dot" style={{ background: category.color || 'hsl(var(--primary))' }} />
                            <span className="nav-label">{category.name}</span>
                        </button>
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
