const { randomUUID } = require('node:crypto')
const { getViewDateRanges } = require('../lib/date-ranges')
const { taskInputSchema, taskListSchema, taskPatchSchema, idSchema } = require('../validation/task-schemas')

function cleanText(value) {
    if (typeof value !== 'string') {
        return value
    }
    const cleaned = value.trim()
    return cleaned || null
}

function normalizeRecurrence({ type, interval, unit = 'day', until, remindAt, currentAnchor = null, resetAnchor = false }) {
    if (type === 'none') {
        return {
            recurrenceType: 'none',
            recurrenceInterval: 1,
            recurrenceUnit: 'day',
            recurrenceAnchorAt: null,
            recurrenceUntil: null
        }
    }
    if (!remindAt) {
        throw new Error('循环提醒需要设置提醒时间')
    }
    const firstAt = new Date(remindAt)
    if (until && new Date(until).getTime() <= firstAt.getTime()) {
        throw new Error('循环结束时间必须晚于首次提醒时间')
    }
    return {
        recurrenceType: type,
        recurrenceInterval: type === 'custom' ? interval : 1,
        recurrenceUnit: type === 'custom' ? unit : 'day',
        recurrenceAnchorAt: resetAnchor || !currentAnchor ? remindAt : currentAnchor,
        recurrenceUntil: until || null
    }
}

class TaskService {
    constructor({ taskRepository, categoryRepository, now = () => new Date() }) {
        this.taskRepository = taskRepository
        this.categoryRepository = categoryRepository
        this.now = now
    }

    list(input = {}) {
        const filters = taskListSchema.parse(input)
        if (filters.view === 'category' && !filters.categoryId) {
            throw new Error('请选择一个分类')
        }
        const ranges = getViewDateRanges(this.now())
        return this.taskRepository.list({ ...filters, ranges })
    }

    getCounts() {
        return this.taskRepository.getCounts(getViewDateRanges(this.now()))
    }

    get(id) {
        const validId = idSchema.parse(id)
        const task = this.taskRepository.getById(validId)
        if (!task) {
            throw new Error('任务不存在或已被删除')
        }
        return {
            ...task,
            children: this.taskRepository.getChildren(validId)
        }
    }

    create(input) {
        const parsed = taskInputSchema.parse(input)
        this.assertCategory(parsed.categoryId)
        this.assertParent(parsed.parentId)
        const recurrence = normalizeRecurrence({
            type: parsed.recurrenceType,
            interval: parsed.recurrenceInterval,
            unit: parsed.recurrenceUnit,
            until: parsed.recurrenceUntil,
            remindAt: parsed.remindAt,
            resetAnchor: true
        })

        const timestamp = this.now().toISOString()
        return this.taskRepository.create({
            ...parsed,
            ...recurrence,
            id: randomUUID(),
            title: parsed.title.trim(),
            description: cleanText(parsed.description),
            status: 'active',
            completedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp
        })
    }

    update(id, patch) {
        const validId = idSchema.parse(id)
        const parsed = taskPatchSchema.parse(patch)
        const existing = this.taskRepository.getById(validId)
        if (!existing) {
            throw new Error('任务不存在或已被删除')
        }

        if (Object.hasOwn(parsed, 'categoryId')) {
            this.assertCategory(parsed.categoryId)
        }
        if (Object.hasOwn(parsed, 'parentId')) {
            this.assertParent(parsed.parentId, validId)
            if (parsed.parentId && this.taskRepository.getChildren(validId).length) {
                throw new Error('包含子任务的任务不能设为其他任务的子任务')
            }
        }

        const recurrenceType = Object.hasOwn(parsed, 'recurrenceType') ? parsed.recurrenceType : existing.recurrenceType
        const recurrenceInterval = Object.hasOwn(parsed, 'recurrenceInterval') ? parsed.recurrenceInterval : existing.recurrenceInterval
        const recurrenceUnit = Object.hasOwn(parsed, 'recurrenceUnit') ? parsed.recurrenceUnit : existing.recurrenceUnit
        const recurrenceUntil = Object.hasOwn(parsed, 'recurrenceUntil') ? parsed.recurrenceUntil : existing.recurrenceUntil
        const remindAt = Object.hasOwn(parsed, 'remindAt') ? parsed.remindAt : existing.remindAt
        const recurrence = normalizeRecurrence({
            type: recurrenceType,
            interval: recurrenceInterval,
            unit: recurrenceUnit,
            until: recurrenceUntil,
            remindAt,
            currentAnchor: existing.recurrenceAnchorAt,
            resetAnchor:
                (Object.hasOwn(parsed, 'remindAt') && parsed.remindAt !== existing.remindAt) ||
                (Object.hasOwn(parsed, 'recurrenceType') && parsed.recurrenceType !== existing.recurrenceType) ||
                (Object.hasOwn(parsed, 'recurrenceUnit') && parsed.recurrenceUnit !== existing.recurrenceUnit)
        })

        return this.taskRepository.update(validId, {
            ...parsed,
            ...recurrence,
            ...(Object.hasOwn(parsed, 'title') ? { title: parsed.title.trim() } : {}),
            ...(Object.hasOwn(parsed, 'description') ? { description: cleanText(parsed.description) } : {}),
            updatedAt: this.now().toISOString()
        })
    }

    complete(id) {
        const validId = idSchema.parse(id)
        const task = this.taskRepository.getById(validId)
        if (!task) {
            throw new Error('任务不存在或已被删除')
        }
        if (task.status === 'completed') {
            return task
        }
        const timestamp = this.now().toISOString()
        return this.taskRepository.update(validId, {
            status: 'completed',
            completedAt: timestamp,
            updatedAt: timestamp
        })
    }

    reopen(id) {
        const validId = idSchema.parse(id)
        const task = this.taskRepository.getById(validId)
        if (!task) {
            throw new Error('任务不存在或已被删除')
        }
        return this.taskRepository.update(validId, {
            status: 'active',
            completedAt: null,
            updatedAt: this.now().toISOString()
        })
    }

    remove(id) {
        const validId = idSchema.parse(id)
        const timestamp = this.now().toISOString()
        const changes = this.taskRepository.softDeleteTree(validId, timestamp)
        if (!changes) {
            throw new Error('任务不存在或已被删除')
        }
        return { removed: changes }
    }

    assertCategory(categoryId) {
        if (categoryId && !this.categoryRepository.getById(categoryId)) {
            throw new Error('所选分类不存在')
        }
    }

    assertParent(parentId, currentId = null) {
        if (!parentId) {
            return
        }
        if (parentId === currentId) {
            throw new Error('任务不能成为自己的子任务')
        }
        const parent = this.taskRepository.getById(parentId)
        if (!parent) {
            throw new Error('父任务不存在')
        }
        if (parent.parentId) {
            throw new Error('日序支持一级子任务，不能继续嵌套')
        }
    }
}

module.exports = {
    TaskService
}
