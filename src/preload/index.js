const { contextBridge, ipcRenderer } = require('electron')

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('daymark', {
    tasks: {
        list: (filters) => invoke('tasks:list', filters),
        get: (id) => invoke('tasks:get', id),
        counts: () => invoke('tasks:counts'),
        create: (input) => invoke('tasks:create', input),
        update: (id, patch) => invoke('tasks:update', id, patch),
        complete: (id) => invoke('tasks:complete', id),
        reopen: (id) => invoke('tasks:reopen', id),
        remove: (id) => invoke('tasks:remove', id)
    },
    categories: {
        list: () => invoke('categories:list'),
        create: (input) => invoke('categories:create', input),
        update: (id, patch) => invoke('categories:update', id, patch),
        remove: (id) => invoke('categories:remove', id)
    },
    settings: {
        get: () => invoke('settings:get'),
        update: (patch) => invoke('settings:update', patch)
    },
    backup: {
        create: () => invoke('backup:create'),
        restore: () => invoke('backup:restore'),
        chooseDirectory: () => invoke('backup:choose-directory')
    },
    data: {
        openFolder: (kind) => invoke('data:open-folder', kind)
    },
    exportData: {
        json: () => invoke('export:json'),
        csv: () => invoke('export:csv')
    },
    reminders: {
        status: () => invoke('reminders:status'),
        checkNow: () => invoke('reminders:check-now')
    },
    windows: {
        openQuickAdd: () => invoke('window:quick-add'),
        hideQuickAdd: () => invoke('window:hide-quick-add'),
        showMain: () => invoke('window:show-main'),
        minimize: () => invoke('window:minimize'),
        toggleMaximize: () => invoke('window:toggle-maximize'),
        close: () => invoke('window:close'),
        getState: () => invoke('window:get-state'),
        openDevTools: () => invoke('window:open-devtools')
    },
    app: {
        info: () => invoke('app:info')
    },
    onDataChanged: (callback) => {
        const listener = () => callback()
        ipcRenderer.on('data:changed', listener)
        return () => ipcRenderer.removeListener('data:changed', listener)
    },
    onTaskOpen: (callback) => {
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on('task:open', listener)
        return () => ipcRenderer.removeListener('task:open', listener)
    },
    onNavigate: (callback) => {
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on('navigation:view', listener)
        return () => ipcRenderer.removeListener('navigation:view', listener)
    },
    onMaximizedChanged: (callback) => {
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on('window:maximized-changed', listener)
        return () => ipcRenderer.removeListener('window:maximized-changed', listener)
    }
})
