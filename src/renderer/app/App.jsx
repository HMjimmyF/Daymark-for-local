import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { WindowTitlebar } from '@/components/layout/WindowTitlebar'
import { TaskList } from '@/components/task/TaskList'
import { TaskDetailsPanel } from '@/components/task/TaskDetailsPanel'
import { TaskCreateDialog } from '@/components/dialog/TaskCreateDialog'
import { CommandPalette } from '@/components/dialog/CommandPalette'
import { CategoryManagerDialog } from '@/components/dialog/CategoryManagerDialog'
import { CompleteRecurringDialog } from '@/components/dialog/CompleteRecurringDialog'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useAppData } from '@/hooks/use-app-data'
import { useTheme } from '@/hooks/use-theme'
import { useAppStore } from '@/stores/app-store'
import { api } from '@/services/daymark'

function ToastHost() {
    const toast = useAppStore((state) => state.toast)
    if (!toast) {
        return null
    }
    return <output className={`toast ${toast.tone === 'error' ? 'error' : ''}`}>{toast.message}</output>
}

function useAppShortcuts() {
    const setCreateOpen = useAppStore((state) => state.setCreateOpen)
    const setCommandOpen = useAppStore((state) => state.setCommandOpen)

    useEffect(() => {
        const listener = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                setCommandOpen(true)
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
                event.preventDefault()
                setCreateOpen(true)
            }
        }
        window.addEventListener('keydown', listener)
        return () => window.removeEventListener('keydown', listener)
    }, [setCommandOpen, setCreateOpen])
}

export function App() {
    const activeView = useAppStore((state) => state.activeView)
    const categoryId = useAppStore((state) => state.categoryId)
    const search = useAppStore((state) => state.search)
    const selectedTaskId = useAppStore((state) => state.selectedTaskId)
    const detailsOpen = useAppStore((state) => state.detailsOpen)
    const createOpen = useAppStore((state) => state.createOpen)
    const categoryManagerOpen = useAppStore((state) => state.categoryManagerOpen)
    const navigate = useAppStore((state) => state.navigate)
    const setCreateOpen = useAppStore((state) => state.setCreateOpen)
    const setCategoryManagerOpen = useAppStore((state) => state.setCategoryManagerOpen)
    const openTask = useAppStore((state) => state.openTask)
    const showToast = useAppStore((state) => state.showToast)
    const [recurringCompletionTask, setRecurringCompletionTask] = useState(null)

    const appData = useAppData({ activeView, categoryId, search })
    const selectedCategory = useMemo(() => appData.categories.find((category) => category.id === categoryId), [appData.categories, categoryId])

    useTheme(appData.settings?.theme)
    useAppShortcuts()

    useEffect(
        () =>
            api.onNavigate((payload) => {
                if (payload?.view) {
                    navigate(payload.view)
                }
            }),
        [navigate]
    )

    useEffect(
        () =>
            api.onTaskOpen((payload) => {
                if (payload?.id) {
                    openTask(payload.id)
                }
            }),
        [openTask]
    )

    const toggleTaskStatus = async (task) => {
        try {
            if (task.status === 'completed') {
                await api.tasks.reopen(task.id)
                showToast('任务已重新打开')
            } else {
                await api.tasks.complete(task.id)
                showToast('任务已完成')
            }
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const completeTask = async (task) => {
        if (task.status !== 'completed' && task.recurrenceType !== 'none' && task.remindAt) {
            setRecurringCompletionTask(task)
            return
        }
        await toggleTaskStatus(task)
    }

    const confirmRecurringCompletion = async () => {
        const task = recurringCompletionTask
        setRecurringCompletionTask(null)
        if (task) {
            await toggleTaskStatus(task)
        }
    }

    const removeTask = async (task) => {
        if (!window.confirm(`确定删除“${task.title}”吗？任务会从当前列表和提醒中移除。`)) {
            return
        }
        try {
            await api.tasks.remove(task.id)
            showToast('任务已删除')
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const showDetails = detailsOpen && activeView !== 'settings'

    return (
        <>
            <div className="app-shell">
                <Sidebar categories={appData.categories} counts={appData.counts} />
                <section className={`workspace ${showDetails ? 'details-open' : ''}`}>
                    <WindowTitlebar />
                    <Topbar category={selectedCategory} />
                    {appData.error && (
                        <div className="error-banner" role="alert">
                            <AlertTriangle size={14} />
                            <span>{appData.error}</span>
                        </div>
                    )}
                    <div className={`workspace-body ${showDetails ? 'details-open' : ''}`}>
                        <main className="main-area">
                            <div className="content-scroll">
                                {activeView === 'settings' ? (
                                    <SettingsPage
                                        settings={appData.settings}
                                        onSettingsChanged={() => appData.loadReferenceData()}
                                        onReload={appData.reloadAll}
                                    />
                                ) : (
                                    <TaskList
                                        tasks={appData.tasks}
                                        loading={appData.loading}
                                        view={activeView}
                                        search={search}
                                        selectedTaskId={selectedTaskId}
                                        onCreate={() => setCreateOpen(true)}
                                        onOpen={(task) => openTask(task.id)}
                                        onComplete={completeTask}
                                        onRemove={removeTask}
                                    />
                                )}
                            </div>
                        </main>
                        {showDetails && <TaskDetailsPanel taskId={selectedTaskId} categories={appData.categories} onCompleteTask={completeTask} />}
                    </div>
                </section>
            </div>

            <TaskCreateDialog open={createOpen} categories={appData.categories} onClose={() => setCreateOpen(false)} onCreated={(task) => openTask(task.id)} />
            <CompleteRecurringDialog task={recurringCompletionTask} onCancel={() => setRecurringCompletionTask(null)} onConfirm={confirmRecurringCompletion} />
            <CommandPalette />
            <CategoryManagerDialog
                open={categoryManagerOpen}
                categories={appData.categories}
                onClose={() => setCategoryManagerOpen(false)}
                onChanged={appData.reloadAll}
            />
            <ToastHost />
        </>
    )
}
