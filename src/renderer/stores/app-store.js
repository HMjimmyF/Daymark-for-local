import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
    activeView: 'inbox',
    categoryId: null,
    search: '',
    selectedTaskId: null,
    detailsOpen: false,
    createOpen: false,
    commandOpen: false,
    categoryManagerOpen: false,
    settingsOpen: false,
    toast: null,
    navigate: (view, categoryId = null) => {
        set({
            activeView: view,
            categoryId,
            search: '',
            selectedTaskId: null,
            detailsOpen: false,
            settingsOpen: view === 'settings'
        })
    },
    openTask: (id) => set({ selectedTaskId: id, detailsOpen: true, settingsOpen: false }),
    closeTask: () => set({ selectedTaskId: null, detailsOpen: false }),
    setSearch: (search) => set({ search }),
    setCreateOpen: (createOpen) => set({ createOpen }),
    setCommandOpen: (commandOpen) => set({ commandOpen }),
    setCategoryManagerOpen: (categoryManagerOpen) => set({ categoryManagerOpen }),
    setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    showToast: (message, tone = 'default') => {
        const id = Date.now()
        set({ toast: { id, message, tone } })
        window.setTimeout(() => {
            if (get().toast?.id === id) {
                set({ toast: null })
            }
        }, 3600)
    }
}))
