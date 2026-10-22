import { describe, expect, it } from 'vitest'
import { getTaskGroups } from '../../src/renderer/lib/task-groups'

describe('task list groups', () => {
    it('puts recurring reminders before one-time pending tasks', () => {
        const tasks = [
            { id: 'one', recurrenceType: 'none' },
            { id: 'repeat', recurrenceType: 'daily' }
        ]
        const groups = getTaskGroups(tasks, 'all')

        expect(groups.map((group) => group.label)).toEqual(['重复提醒', '待处理'])
        expect(groups[0].tasks.map((task) => task.id)).toEqual(['repeat'])
        expect(groups[1].tasks.map((task) => task.id)).toEqual(['one'])
    })

    it('omits empty groups and does not split the completed view', () => {
        expect(getTaskGroups([{ id: 'repeat', recurrenceType: 'weekly' }], 'today')).toEqual([
            {
                key: 'recurring',
                label: '重复提醒',
                tasks: [{ id: 'repeat', recurrenceType: 'weekly' }]
            }
        ])
        expect(getTaskGroups([{ id: 'done', recurrenceType: 'daily' }], 'completed')).toEqual([
            {
                key: 'completed',
                label: '最近完成',
                tasks: [{ id: 'done', recurrenceType: 'daily' }]
            }
        ])
    })
})
