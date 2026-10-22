export function getTaskGroups(tasks, view) {
    if (view === 'completed') {
        return tasks.length ? [{ key: 'completed', label: '最近完成', tasks }] : []
    }

    const recurring = tasks.filter((task) => task.recurrenceType !== 'none')
    const pending = tasks.filter((task) => task.recurrenceType === 'none')
    return [
        { key: 'recurring', label: '重复提醒', tasks: recurring },
        { key: 'pending', label: '待处理', tasks: pending }
    ].filter((group) => group.tasks.length > 0)
}
