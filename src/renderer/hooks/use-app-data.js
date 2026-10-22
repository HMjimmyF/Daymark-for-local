import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/services/daymark'

const EMPTY_COUNTS = { inbox: 0, today: 0, upcoming: 0, all: 0 }

export function useAppData({ activeView, categoryId, search }) {
    const [tasks, setTasks] = useState([])
    const [categories, setCategories] = useState([])
    const [settings, setSettings] = useState(null)
    const [counts, setCounts] = useState(EMPTY_COUNTS)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const taskRequest = useRef(0)

    const loadReferenceData = useCallback(async () => {
        try {
            const [nextCategories, nextSettings, nextCounts] = await Promise.all([api.categories.list(), api.settings.get(), api.tasks.counts()])
            setCategories(nextCategories)
            setSettings(nextSettings)
            setCounts(nextCounts)
            setError('')
        } catch (requestError) {
            setError(requestError.message)
        }
    }, [])

    const loadTasks = useCallback(async () => {
        if (activeView === 'settings') {
            setTasks([])
            setLoading(false)
            return
        }
        const requestId = ++taskRequest.current
        setLoading(true)
        try {
            const nextTasks = await api.tasks.list({
                view: activeView,
                categoryId,
                search
            })
            if (requestId === taskRequest.current) {
                setTasks(nextTasks)
                setError('')
            }
        } catch (requestError) {
            if (requestId === taskRequest.current) {
                setError(requestError.message)
            }
        } finally {
            if (requestId === taskRequest.current) {
                setLoading(false)
            }
        }
    }, [activeView, categoryId, search])

    const reloadAll = useCallback(async () => {
        await Promise.all([loadReferenceData(), loadTasks()])
    }, [loadReferenceData, loadTasks])

    useEffect(() => {
        loadReferenceData()
    }, [loadReferenceData])

    useEffect(() => {
        const timer = window.setTimeout(loadTasks, search ? 140 : 0)
        return () => window.clearTimeout(timer)
    }, [loadTasks, search])

    useEffect(() => api.onDataChanged(reloadAll), [reloadAll])

    return {
        tasks,
        categories,
        settings,
        counts,
        loading,
        error,
        reloadAll,
        loadReferenceData
    }
}

export function useTaskDetail(taskId) {
    const [task, setTask] = useState(null)
    const [loading, setLoading] = useState(false)
    const requestId = useRef(0)

    const reload = useCallback(async () => {
        if (!taskId) {
            setTask(null)
            return
        }
        const currentRequest = ++requestId.current
        setLoading(true)
        try {
            const nextTask = await api.tasks.get(taskId)
            if (currentRequest === requestId.current) {
                setTask(nextTask)
            }
        } catch {
            if (currentRequest === requestId.current) {
                setTask(null)
            }
        } finally {
            if (currentRequest === requestId.current) {
                setLoading(false)
            }
        }
    }, [taskId])

    useEffect(() => {
        reload()
    }, [reload])

    useEffect(() => api.onDataChanged(reload), [reload])

    return { task, loading, reload }
}
