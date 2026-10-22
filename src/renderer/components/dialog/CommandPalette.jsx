import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CheckCircle2, Inbox, Plus, Search, Settings } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'
import { formatShortDate } from '@/lib/date'

const navigationCommands = [
    { id: 'inbox', label: '前往收集箱', icon: Inbox },
    { id: 'today', label: '查看今天', icon: CalendarDays },
    { id: 'completed', label: '查看已完成', icon: CheckCircle2 },
    { id: 'settings', label: '打开设置与数据', icon: Settings }
]

export function CommandPalette() {
    const open = useAppStore((state) => state.commandOpen)
    const setOpen = useAppStore((state) => state.setCommandOpen)
    const navigate = useAppStore((state) => state.navigate)
    const openTask = useAppStore((state) => state.openTask)
    const setCreateOpen = useAppStore((state) => state.setCreateOpen)
    const [query, setQuery] = useState('')
    const [tasks, setTasks] = useState([])
    const [searchError, setSearchError] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef(null)

    useEffect(() => {
        if (open) {
            setQuery('')
            setTasks([])
            setSearchError('')
            setActiveIndex(0)
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            return
        }
        const timer = window.setTimeout(async () => {
            if (!query.trim()) {
                setTasks([])
                return
            }
            try {
                setTasks(await api.tasks.list({ view: 'all', search: query }))
                setSearchError('')
                setActiveIndex(0)
            } catch (error) {
                console.error('Task search failed', error)
                setTasks([])
                setSearchError(error.message)
            }
        }, 100)
        return () => window.clearTimeout(timer)
    }, [open, query])

    const runTask = (task) => {
        openTask(task.id)
        setOpen(false)
    }

    const runNavigation = (view) => {
        navigate(view)
        setOpen(false)
    }

    const runCreate = () => {
        setOpen(false)
        setCreateOpen(true)
    }

    const actions = query.trim() ? tasks.map((task) => ({ type: 'task', task })) : navigationCommands.map((command) => ({ type: 'navigation', command }))

    const activate = (index = activeIndex) => {
        const action = actions[index]
        if (!action) {
            return
        }
        if (action.type === 'task') {
            runTask(action.task)
        } else {
            runNavigation(action.command.id)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="command" showClose={false} onOpenAutoFocus={() => inputRef.current?.focus()}>
                <DialogTitle style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>搜索与命令</DialogTitle>
                <DialogDescription style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                    搜索本地任务，或快速前往常用视图。
                </DialogDescription>
                <div className="command-search">
                    <Search size={17} color="hsl(var(--subtle-foreground))" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault()
                                setActiveIndex((index) => Math.min(actions.length - 1, index + 1))
                            } else if (event.key === 'ArrowUp') {
                                event.preventDefault()
                                setActiveIndex((index) => Math.max(0, index - 1))
                            } else if (event.key === 'Enter') {
                                event.preventDefault()
                                activate()
                            }
                        }}
                        placeholder="搜索任务或输入命令…"
                        aria-label="搜索任务或命令"
                    />
                    <span style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 10 }}>ESC 关闭</span>
                </div>
                <div className="command-list">
                    {!query && (
                        <>
                            <div className="command-section-label">快速操作</div>
                            <button type="button" className="command-item" onClick={runCreate}>
                                <Plus size={15} />
                                <span className="command-item-main">
                                    <span className="command-item-title">新建任务</span>
                                    <span className="command-item-hint">Ctrl N</span>
                                </span>
                            </button>
                            <div className="command-section-label">前往</div>
                        </>
                    )}
                    {actions.map((action, index) => {
                        if (action.type === 'task') {
                            return (
                                <button
                                    type="button"
                                    key={action.task.id}
                                    className={`command-item ${activeIndex === index ? 'active' : ''}`}
                                    onClick={() => activate(index)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                >
                                    <CheckCircle2 size={15} />
                                    <span className="command-item-main">
                                        <span className="command-item-title">{action.task.title}</span>
                                        <span className="command-item-hint">{action.task.dueAt ? formatShortDate(action.task.dueAt) : '无截止时间'}</span>
                                    </span>
                                </button>
                            )
                        }
                        const Icon = action.command.icon
                        return (
                            <button
                                type="button"
                                key={action.command.id}
                                className={`command-item ${activeIndex === index ? 'active' : ''}`}
                                onClick={() => activate(index)}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                <Icon size={15} />
                                <span className="command-item-title">{action.command.label}</span>
                            </button>
                        )
                    })}
                    {query && !tasks.length && (
                        <div
                            style={{
                                padding: '24px 9px',
                                textAlign: 'center',
                                color: searchError ? 'hsl(var(--danger))' : 'hsl(var(--subtle-foreground))',
                                fontSize: 12
                            }}
                        >
                            {searchError || '没有找到匹配任务'}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
