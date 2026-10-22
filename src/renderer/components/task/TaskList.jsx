import { CalendarCheck2, CheckCircle2, Inbox, Plus, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskRow } from './TaskRow'

function EmptyState({ view, searching, onCreate }) {
    const config = searching
        ? { icon: SearchX, title: '没有匹配的任务', copy: '换一个关键词，或清空搜索查看当前视图。' }
        : view === 'completed'
          ? { icon: CheckCircle2, title: '还没有完成的任务', copy: '完成任务后，它们会安静地出现在这里。' }
          : view === 'today'
            ? { icon: CalendarCheck2, title: '今天很清爽', copy: '添加一项今天需要完成的任务，让日序替你记住。' }
            : { icon: Inbox, title: '从一件小事开始', copy: '快速记下脑中的事项，之后再安排日期和分类。' }
    const Icon = config.icon
    return (
        <div className="empty-state">
            <div className="empty-icon">
                <Icon size={23} />
            </div>
            <h2 className="empty-title">{config.title}</h2>
            <p className="empty-copy">{config.copy}</p>
            {!searching && view !== 'completed' && (
                <Button onClick={onCreate}>
                    <Plus size={15} />
                    添加任务
                </Button>
            )}
        </div>
    )
}

export function TaskList({ tasks, loading, view, search, selectedTaskId, onCreate, onOpen, onComplete, onRemove }) {
    if (loading && !tasks.length) {
        return (
            <div className="skeleton-list" aria-label="正在加载任务">
                {[0, 1, 2, 3].map((row) => (
                    <div className="skeleton-row" key={row}>
                        <span className="skeleton-circle" />
                        <span className="skeleton-line" style={{ width: `${38 + row * 8}%` }} />
                    </div>
                ))}
            </div>
        )
    }

    if (!tasks.length) {
        return <EmptyState view={view} searching={Boolean(search)} onCreate={onCreate} />
    }

    return (
        <div className="task-list">
            <div className="list-day">{view === 'completed' ? '最近完成' : search ? '搜索结果' : '待处理'}</div>
            {tasks.map((task) => (
                <TaskRow key={task.id} task={task} selected={selectedTaskId === task.id} onOpen={onOpen} onComplete={onComplete} onRemove={onRemove} />
            ))}
        </div>
    )
}
