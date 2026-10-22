function getApi() {
    if (!window.daymark) {
        throw new Error('日序桌面接口尚未就绪')
    }
    return window.daymark
}

export async function unwrap(promise) {
    const response = await promise
    if (!response?.ok) {
        throw new Error(response?.error?.message || '操作失败，请稍后重试')
    }
    return response.data
}

export const api = {
    tasks: {
        list: (filters) => unwrap(getApi().tasks.list(filters)),
        get: (id) => unwrap(getApi().tasks.get(id)),
        counts: () => unwrap(getApi().tasks.counts()),
        create: (input) => unwrap(getApi().tasks.create(input)),
        update: (id, patch) => unwrap(getApi().tasks.update(id, patch)),
        complete: (id) => unwrap(getApi().tasks.complete(id)),
        reopen: (id) => unwrap(getApi().tasks.reopen(id)),
        remove: (id) => unwrap(getApi().tasks.remove(id))
    },
    categories: {
        list: () => unwrap(getApi().categories.list()),
        create: (input) => unwrap(getApi().categories.create(input)),
        update: (id, patch) => unwrap(getApi().categories.update(id, patch)),
        remove: (id) => unwrap(getApi().categories.remove(id))
    },
    settings: {
        get: () => unwrap(getApi().settings.get()),
        update: (patch) => unwrap(getApi().settings.update(patch))
    },
    backup: {
        create: () => unwrap(getApi().backup.create()),
        restore: () => unwrap(getApi().backup.restore()),
        chooseDirectory: () => unwrap(getApi().backup.chooseDirectory())
    },
    data: {
        openFolder: (kind) => unwrap(getApi().data.openFolder(kind))
    },
    exportData: {
        json: () => unwrap(getApi().exportData.json()),
        csv: () => unwrap(getApi().exportData.csv())
    },
    reminders: {
        status: () => unwrap(getApi().reminders.status()),
        checkNow: () => unwrap(getApi().reminders.checkNow())
    },
    windows: {
        openQuickAdd: () => unwrap(getApi().windows.openQuickAdd()),
        hideQuickAdd: () => unwrap(getApi().windows.hideQuickAdd()),
        showMain: () => unwrap(getApi().windows.showMain()),
        minimize: () => unwrap(getApi().windows.minimize()),
        toggleMaximize: () => unwrap(getApi().windows.toggleMaximize()),
        close: () => unwrap(getApi().windows.close()),
        getState: () => unwrap(getApi().windows.getState()),
        openDevTools: () => unwrap(getApi().windows.openDevTools())
    },
    app: {
        info: () => unwrap(getApi().app.info())
    },
    onDataChanged: (callback) => getApi().onDataChanged(callback),
    onTaskOpen: (callback) => getApi().onTaskOpen(callback),
    onNavigate: (callback) => getApi().onNavigate(callback),
    onMaximizedChanged: (callback) => getApi().onMaximizedChanged(callback)
}
