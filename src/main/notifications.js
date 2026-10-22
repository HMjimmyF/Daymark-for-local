const { Notification } = require('electron')

function createNotifier({ windowManager }) {
    const notify = (options) => {
        if (!Notification.isSupported()) {
            return
        }
        const notification = new Notification({
            title: '日序',
            body: options.body,
            icon: windowManager.getIcon(),
            silent: false
        })
        notification.on('click', () => {
            if (options.taskId) {
                windowManager.showMain()
                windowManager.broadcast('task:open', { id: options.taskId })
            } else {
                windowManager.showMain({ view: 'today' })
            }
        })
        notification.show()
    }
    notify.supported = () => Notification.isSupported()
    return notify
}

module.exports = {
    createNotifier
}
