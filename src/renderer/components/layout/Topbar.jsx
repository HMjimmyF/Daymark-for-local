import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Command, Copy, Minus, Plus, Search, Square, X } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { formatHeaderDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { VIEW_META } from '@/components/common/view-config'
import { api } from '@/services/daymark'

function WindowControls() {
    const [maximized, setMaximized] = useState(false)

    useEffect(() => {
        api.windows
            .getState()
            .then((state) => setMaximized(state.maximized))
            .catch(() => {})
        return api.onMaximizedChanged((state) => setMaximized(state.maximized))
    }, [])

    return (
        <div className="window-controls">
            <button type="button" className="window-control" onClick={() => api.windows.minimize()} aria-label="最小化窗口">
                <Minus size={15} strokeWidth={1.7} />
            </button>
            <button type="button" className="window-control" onClick={() => api.windows.toggleMaximize()} aria-label={maximized ? '还原窗口' : '最大化窗口'}>
                {maximized ? <Copy size={13} strokeWidth={1.7} /> : <Square size={12} strokeWidth={1.6} />}
            </button>
            <button type="button" className="window-control close" onClick={() => api.windows.close()} aria-label="关闭窗口">
                <X size={16} strokeWidth={1.7} />
            </button>
        </div>
    )
}

export function Topbar({ category }) {
    const topbarRef = useRef(null)
    const activeView = useAppStore((state) => state.activeView)
    const search = useAppStore((state) => state.search)
    const setSearch = useAppStore((state) => state.setSearch)
    const setCreateOpen = useAppStore((state) => state.setCreateOpen)
    const setCommandOpen = useAppStore((state) => state.setCommandOpen)
    const navigate = useAppStore((state) => state.navigate)
    const meta = category && activeView === 'category' ? { label: category.name, description: '分类中的活跃任务' } : VIEW_META[activeView]

    useLayoutEffect(() => {
        const topbar = topbarRef.current
        if (!topbar) {
            return
        }
        const updateHeight = () => {
            document.documentElement.style.setProperty('--topbar-height', `${topbar.getBoundingClientRect().height}px`)
        }
        updateHeight()
        const observer = new ResizeObserver(updateHeight)
        observer.observe(topbar)
        return () => {
            observer.disconnect()
            document.documentElement.style.removeProperty('--topbar-height')
        }
    }, [])

    return (
        <header className="topbar" ref={topbarRef}>
            <div className="view-heading">
                <div className="view-title-row">
                    <h1 className="view-title">{meta?.label || '日序'}</h1>
                </div>
                <div className="view-meta">{activeView === 'settings' ? '偏好与应用数据' : `${formatHeaderDate()} · ${meta?.description || ''}`}</div>
            </div>

            <div className="topbar-actions">
                {activeView !== 'settings' && (
                    <>
                        <label className="search-box">
                            <Search size={14} />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索任务…" aria-label="搜索任务" />
                            <span className="search-shortcut">Ctrl K</span>
                        </label>
                        <button type="button" className="icon-button bordered" onClick={() => setCommandOpen(true)} aria-label="打开命令面板">
                            <Command size={15} />
                        </button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus size={15} />
                            新建
                        </Button>
                    </>
                )}
                {activeView === 'settings' && (
                    <button type="button" className="button secondary" onClick={() => navigate('inbox')}>
                        返回任务
                    </button>
                )}
                <WindowControls />
            </div>
        </header>
    )
}
