import { AlertCircle, Bell, BellRing, CalendarDays, Check, CheckCircle2, Flag, ListTree, MoreHorizontal, Repeat2, RotateCcw, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCompletedDate, formatDueDate, formatRecurrence, formatShortDate } from '@/lib/date'

export function TaskRow({ task, selected, onOpen, onComplete, onRemove }) {
    const completed = task.status === 'completed'
    const overdue = !completed && task.dueAt && new Date(task.dueAt).getTime() < Date.now()
    const reminded = !completed && Boolean(task.remindedAt) && task.recurrenceType === 'none'

    return (
        <div className={`task-row ${selected ? 'selected' : ''} ${completed ? 'completed' : ''}`}>
            <button
                type="button"
                className={`task-check ${completed ? 'checked' : ''}`}
                onClick={() => onComplete(task)}
                aria-label={completed ? `重新打开任务：${task.title}` : `完成任务：${task.title}`}
            >
                {completed && <Check size={13} strokeWidth={3} />}
            </button>
            <button type="button" className="task-main" onClick={() => onOpen(task)}>
                <div className={`task-title ${completed ? 'done' : ''}`}>{task.title}</div>
                {(task.dueAt || task.remindAt || task.categoryName || task.priority > 0 || completed) && (
                    <div className="task-meta">
                        {task.dueAt && (
                            <span className={`meta-item ${overdue ? 'overdue' : ''}`}>
                                <CalendarDays size={11} />
                                {overdue && <AlertCircle size={10} />}
                                {formatDueDate(task.dueAt)}
                            </span>
                        )}
                        {task.remindAt && (
                            <span className="meta-item">
                                {reminded ? (
                                    <>
                                        <BellRing size={10} />
                                        已提醒
                                    </>
                                ) : (
                                    <>
                                        {task.recurrenceType !== 'none' ? <Repeat2 size={10} /> : <Bell size={10} />}
                                        {task.recurrenceType !== 'none'
                                            ? `${formatRecurrence(task.recurrenceType, task.recurrenceInterval, task.recurrenceUnit)} · ${formatShortDate(task.remindAt)}`
                                            : formatShortDate(task.remindAt)}
                                    </>
                                )}
                            </span>
                        )}
                        {task.categoryName && (
                            <span className="meta-item">
                                <span className="category-dot" style={{ width: 6, height: 6, background: task.categoryColor || 'hsl(var(--primary))' }} />
                                {task.categoryName}
                            </span>
                        )}
                        {task.priority > 0 && (
                            <span className={`meta-item priority-${task.priority}`}>
                                <Flag size={10} />
                                {['', '低', '中', '高'][task.priority]}
                            </span>
                        )}
                        {completed && <span className="meta-item">{formatCompletedDate(task.completedAt)}</span>}
                    </div>
                )}
            </button>
            <div className="task-trailing">
                {task.parentId && <ListTree size={13} aria-label="子任务" />}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className="icon-button" style={{ width: 28, height: 28 }} aria-label={`${task.title} 的更多操作`}>
                            <MoreHorizontal size={15} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onComplete(task)}>
                            {completed ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                            {completed ? '重新打开' : '标记完成'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onOpen(task)}>
                            <ListTree size={14} />
                            查看详情
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="danger" onSelect={() => onRemove(task)}>
                            <Trash2 size={14} />
                            删除任务
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
