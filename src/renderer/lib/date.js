import { addDays, endOfDay, format, isSameDay, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDueDate(value) {
    if (!value) {
        return ''
    }
    const date = parseISO(value)
    if (isSameDay(date, new Date())) {
        return `今天 ${format(date, 'HH:mm')}`
    }
    if (isTomorrow(date)) {
        return `明天 ${format(date, 'HH:mm')}`
    }
    return format(date, 'M月d日 EEE HH:mm', { locale: zhCN })
}

export function formatShortDate(value) {
    if (!value) {
        return ''
    }
    return format(parseISO(value), 'M月d日 HH:mm', { locale: zhCN })
}

export function formatCompletedDate(value) {
    return value ? format(parseISO(value), 'M月d日 HH:mm 完成', { locale: zhCN }) : '已完成'
}

export function toDateTimeInput(value) {
    return value ? format(parseISO(value), "yyyy-MM-dd'T'HH:mm") : ''
}

export function fromDateTimeInput(value) {
    if (!value) {
        return null
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toDateInput(value) {
    return value ? format(parseISO(value), 'yyyy-MM-dd') : ''
}

export function fromDateInput(value) {
    if (!value) {
        return null
    }
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? null : endOfDay(date).toISOString()
}

export function formatRecurrence(type, interval = 1) {
    const labels = {
        none: '',
        daily: '每天',
        weekdays: '工作日',
        weekly: '每周',
        monthly: '每月',
        custom: `每 ${interval} 天`
    }
    return labels[type] || ''
}

export function dateAt(hour, dayOffset = 0) {
    const date = addDays(startOfDay(new Date()), dayOffset)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
}

export function todayIso() {
    return startOfDay(new Date()).toISOString()
}

export function formatHeaderDate() {
    return format(new Date(), 'M月d日 EEEE', { locale: zhCN })
}
