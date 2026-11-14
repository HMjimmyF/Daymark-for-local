import { useLayoutEffect, useRef, useState } from 'react'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { formatHeaderDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { VIEW_META } from '@/components/common/view-config'

export function Topbar({ category, onRefresh }) {
    const topbarRef = useRef(null)
    const [refreshing, setRefreshing] = useState(false)
    const activeView = useAppStore((state) => state.activeView)
    const search = useAppStore((state) => state.search)
    const setSearch = useAppStore((state) => state.setSearch)
    const setCreateOpen = useAppStore((state) => state.setCreateOpen)
    const navigate = useAppStore((state) => state.navigate)
    const showToast = useAppStore((state) => state.showToast)
    const meta = category && activeView === 'category' ? { label: category.name, description: '分类中的活跃任务' } : VIEW_META[activeView]

    const refresh = async () => {
        if (refreshing || !onRefresh) {
            return
        }
        setRefreshing(true)
        try {
            await onRefresh()
            showToast('列表已刷新')
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setRefreshing(false)
        }
    }

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
                        <button
                            type="button"
                            className={`icon-button bordered refresh-button${refreshing ? ' refreshing' : ''}`}
                            onClick={refresh}
                            disabled={refreshing}
                            title="刷新列表"
                            aria-label="刷新列表"
                        >
                            <RefreshCw size={15} />
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
            </div>
        </header>
    )
}
