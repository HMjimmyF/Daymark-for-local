export const VIEW_META = {
    inbox: {
        label: '收集箱',
        description: '尚未安排或归类的任务'
    },
    today: {
        label: '今天',
        description: '今天需要完成的事项'
    },
    upcoming: {
        label: '未来 7 天',
        description: '包含今天的七个自然日'
    },
    all: {
        label: '全部待办',
        description: '所有尚未完成的任务'
    },
    completed: {
        label: '已完成',
        description: '按完成时间倒序排列'
    },
    settings: {
        label: '设置',
        description: '偏好、快捷键与本地数据'
    }
}

export const PRIORITY_OPTIONS = [
    { value: 0, label: '无优先级' },
    { value: 1, label: '低优先级' },
    { value: 2, label: '中优先级' },
    { value: 3, label: '高优先级' }
]

export const RECURRENCE_OPTIONS = [
    { value: 'none', label: '不重复' },
    { value: 'daily', label: '每天' },
    { value: 'weekdays', label: '每个工作日' },
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'custom', label: '自定义间隔' }
]

export const CATEGORY_COLORS = ['#5B82F6', '#20A37B', '#E7A33E', '#DB6D87', '#8B6FE8', '#4B9FAD']
