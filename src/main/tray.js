const { Menu, Tray } = require('electron')

function createTray({ app, windowManager }) {
    const tray = new Tray(windowManager.getTrayIcon())
    tray.setToolTip('日序 · 让每一天，都有条理')
    const menu = Menu.buildFromTemplate([
        {
            label: '打开日序',
            click: () => windowManager.showMain()
        },
        {
            label: '快速添加任务',
            click: () => windowManager.showQuickAdd()
        },
        {
            label: '查看今日任务',
            click: () => windowManager.showMain({ view: 'today' })
        },
        {
            type: 'separator'
        },
        {
            label: '设置与数据',
            click: () => windowManager.showMain({ view: 'settings' })
        },
        {
            type: 'separator'
        },
        {
            label: '退出',
            click: () => app.quit()
        }
    ])
    tray.setContextMenu(menu)
    tray.on('click', () => windowManager.toggleMain())
    return tray
}

module.exports = {
    createTray
}
