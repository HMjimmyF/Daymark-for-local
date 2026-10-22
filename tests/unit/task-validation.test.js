import { describe, expect, it, vi } from 'vitest'
import { TaskService } from '../../core/services/task-service'

function createService() {
    const taskRepository = {
        create: vi.fn((task) => task),
        getById: vi.fn(() => null),
        getChildren: vi.fn(() => [])
    }
    const categoryRepository = {
        getById: vi.fn(() => null)
    }
    return new TaskService({
        taskRepository,
        categoryRepository,
        now: () => new Date('2026-10-22T08:00:00.000Z')
    })
}

describe('TaskService validation', () => {
    it('trims titles and optional descriptions', () => {
        const service = createService()
        const task = service.create({ title: '  写周报  ', description: '   ', priority: 2 })

        expect(task.title).toBe('写周报')
        expect(task.description).toBeNull()
        expect(task.status).toBe('active')
    })

    it('rejects empty titles and invalid priority boundaries', () => {
        const service = createService()
        expect(() => service.create({ title: '   ' })).toThrow('任务标题不能为空')
        expect(() => service.create({ title: '测试', priority: 4 })).toThrow()
        expect(() => service.create({ title: '测试', priority: -1 })).toThrow()
    })

    it('rejects unknown date formats at the IPC boundary', () => {
        const service = createService()
        expect(() => service.create({ title: '测试', dueAt: '2026-10-22 18:00' })).toThrow('日期格式无效')
    })

    it('normalizes recurrence units and validates custom units', () => {
        const service = createService()
        const fixedReminder = '2026-10-22T09:00:00.000Z'
        const recurring = service.create({
            title: '按季度复盘',
            remindAt: fixedReminder,
            recurrenceType: 'custom',
            recurrenceInterval: 3,
            recurrenceUnit: 'month'
        })
        const oneTime = service.create({ title: '一次性提醒', remindAt: fixedReminder })

        expect(recurring.recurrenceUnit).toBe('month')
        expect(oneTime.recurrenceUnit).toBe('day')
        expect(() => service.create({ title: '错误单位', recurrenceType: 'custom', recurrenceUnit: 'week' })).toThrow()
    })
})
