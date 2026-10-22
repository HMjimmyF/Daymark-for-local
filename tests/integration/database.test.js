import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseManager } from '../../core/database/connection'
import { TaskRepository } from '../../core/database/repositories/task-repository'
import { CategoryRepository } from '../../core/database/repositories/category-repository'
import { SettingsRepository } from '../../core/database/repositories/settings-repository'
import { TaskService } from '../../core/services/task-service'
import { CategoryService } from '../../core/services/category-service'
import { SettingsService } from '../../core/services/settings-service'
import { BackupService } from '../../core/services/backup-service'
import { ExportService } from '../../core/services/export-service'
import { ReminderService } from '../../core/services/reminder-service'
import { migrations } from '../../core/database/migrations'

let tempDir
let manager
let taskService
let categoryService
let settingsService
let taskRepository
let categoryRepository
let settingsRepository

const fixedNow = new Date(2026, 9, 22, 10, 0, 0)

function rebuildServices() {
    taskRepository = new TaskRepository(manager.db)
    categoryRepository = new CategoryRepository(manager.db)
    settingsRepository = new SettingsRepository(manager.db)
    settingsService = new SettingsService({ settingsRepository, now: () => fixedNow })
    taskService = new TaskService({ taskRepository, categoryRepository, now: () => fixedNow })
    categoryService = new CategoryService({ categoryRepository, now: () => fixedNow })
}

beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daymark-test-'))
    manager = new DatabaseManager(path.join(tempDir, 'daymark.sqlite'))
    manager.open()
    rebuildServices()
})

afterEach(() => {
    manager?.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
})

describe('SQLite repositories and services', () => {
    it('persists task CRUD across database reopen', () => {
        const task = taskService.create({ title: '本地持久化测试', description: '内容' })
        expect(taskService.get(task.id).title).toBe('本地持久化测试')
        taskService.update(task.id, { title: '已编辑', priority: 3 })
        taskService.complete(task.id)

        manager.close()
        manager.open()
        rebuildServices()

        const persisted = taskService.get(task.id)
        expect(persisted.title).toBe('已编辑')
        expect(persisted.status).toBe('completed')
        expect(persisted.priority).toBe(3)
    })

    it('filters today and upcoming with local calendar boundaries', () => {
        const todayAt18 = new Date(2026, 9, 22, 18, 0, 0).toISOString()
        const seventhDayAtNoon = new Date(2026, 9, 28, 12, 0, 0).toISOString()
        const eighthDayAtNoon = new Date(2026, 9, 29, 12, 0, 0).toISOString()
        taskService.create({ title: '今天任务', dueAt: todayAt18 })
        taskService.create({ title: '第七天任务', dueAt: seventhDayAtNoon })
        taskService.create({ title: '范围外任务', dueAt: eighthDayAtNoon })

        expect(taskService.list({ view: 'today' }).map((task) => task.title)).toEqual(['今天任务'])
        expect(taskService.list({ view: 'upcoming' }).map((task) => task.title)).toEqual(['今天任务', '第七天任务'])
    })

    it('moves tasks to the inbox when deleting a category', () => {
        const category = categoryService.create({ name: '工作', color: '#5B82F6' })
        const task = taskService.create({ title: '分类任务', categoryId: category.id })
        const result = categoryService.remove(category.id)

        expect(result.movedTasks).toBe(1)
        expect(taskService.get(task.id).categoryId).toBeNull()
        expect(taskService.list({ view: 'inbox' }).some((item) => item.id === task.id)).toBe(true)
    })

    it('supports only one level of subtasks', () => {
        const parent = taskService.create({ title: '父任务' })
        const child = taskService.create({ title: '子任务', parentId: parent.id })

        expect(taskService.get(parent.id).children).toHaveLength(1)
        expect(() => taskService.create({ title: '孙任务', parentId: child.id })).toThrow('不能继续嵌套')
    })

    it('soft deletes parent tasks and their children together', () => {
        const parent = taskService.create({ title: '父任务' })
        const child = taskService.create({ title: '子任务', parentId: parent.id })
        taskService.remove(parent.id)

        expect(() => taskService.get(parent.id)).toThrow('任务不存在')
        expect(() => taskService.get(child.id)).toThrow('任务不存在')
    })

    it('creates, validates, and restores complete database backups', async () => {
        const original = taskService.create({ title: '备份前任务' })
        const backupService = new BackupService({
            databaseManager: manager,
            settingsService,
            defaultBackupDirectory: path.join(tempDir, 'backups'),
            now: () => fixedNow
        })
        const backup = await backupService.create()
        expect(DatabaseManager.validateDatabase(backup.path).version).toBe(3)

        taskService.create({ title: '恢复后应消失' })
        await backupService.restore(backup.path)
        rebuildServices()

        const titles = taskService.list({ view: 'all' }).map((task) => task.title)
        expect(titles).toContain(original.title)
        expect(titles).not.toContain('恢复后应消失')
        expect(fs.existsSync(path.join(tempDir, 'backups'))).toBe(true)
    })

    it('deduplicates reminder delivery and ignores completed tasks', () => {
        const notify = vi.fn()
        notify.supported = () => true
        const dueAt = new Date(2026, 9, 22, 9, 0, 0).toISOString()
        const task = taskService.create({ title: '提醒测试', remindAt: dueAt })
        const reminders = new ReminderService({
            taskRepository,
            settingsService,
            notify,
            now: () => fixedNow
        })

        expect(reminders.check().delivered).toBe(1)
        expect(reminders.check().delivered).toBe(0)
        expect(notify).toHaveBeenCalledTimes(1)

        const completed = taskService.create({ title: '已完成不提醒', remindAt: dueAt })
        taskService.complete(completed.id)
        expect(reminders.check().delivered).toBe(0)
        expect(task.id).toBeTruthy()
    })

    it('advances the same task to its next recurring reminder', () => {
        let reminderNow = new Date(2026, 9, 22, 10, 0, 0)
        const notify = vi.fn()
        notify.supported = () => true
        const task = taskService.create({
            title: '每天喝水',
            remindAt: new Date(2026, 9, 22, 9, 0, 0).toISOString(),
            recurrenceType: 'daily',
            recurrenceInterval: 1
        })
        const reminders = new ReminderService({
            taskRepository,
            settingsService,
            notify,
            now: () => reminderNow
        })

        expect(reminders.check().delivered).toBe(1)
        expect(new Date(taskService.get(task.id).remindAt).getTime()).toBe(new Date(2026, 9, 23, 9, 0, 0).getTime())
        expect(reminders.check().delivered).toBe(0)

        reminderNow = new Date(2026, 9, 23, 10, 0, 0)
        expect(reminders.check().delivered).toBe(1)
        expect(new Date(taskService.get(task.id).remindAt).getTime()).toBe(new Date(2026, 9, 24, 9, 0, 0).getTime())
    })

    it('persists and advances custom month recurrence units', () => {
        let reminderNow = new Date(2026, 9, 22, 10, 0, 0)
        const notify = vi.fn()
        notify.supported = () => true
        const task = taskService.create({
            title: '季度复盘',
            remindAt: new Date(2026, 9, 22, 9, 0, 0).toISOString(),
            recurrenceType: 'custom',
            recurrenceInterval: 3,
            recurrenceUnit: 'month'
        })
        const reminders = new ReminderService({
            taskRepository,
            settingsService,
            notify,
            now: () => reminderNow
        })

        expect(reminders.check().delivered).toBe(1)
        expect(taskService.get(task.id).recurrenceUnit).toBe('month')
        expect(new Date(taskService.get(task.id).remindAt).getTime()).toBe(new Date(2027, 0, 22, 9, 0, 0).getTime())

        reminderNow = new Date(2027, 0, 22, 10, 0, 0)
        expect(reminders.check().delivered).toBe(1)
        expect(new Date(taskService.get(task.id).remindAt).getTime()).toBe(new Date(2027, 3, 22, 9, 0, 0).getTime())
    })

    it('ends a recurring reminder after its end date', () => {
        const notify = vi.fn()
        notify.supported = () => true
        const task = taskService.create({
            title: '仅今天循环',
            remindAt: new Date(2026, 9, 22, 9, 0, 0).toISOString(),
            recurrenceType: 'daily',
            recurrenceInterval: 1,
            recurrenceUntil: new Date(2026, 9, 22, 23, 59, 59).toISOString()
        })
        const reminders = new ReminderService({
            taskRepository,
            settingsService,
            notify,
            now: () => fixedNow
        })

        expect(reminders.check().delivered).toBe(1)
        expect(taskService.get(task.id).remindAt).toBeNull()
        expect(taskService.get(task.id).recurrenceType).toBe('none')
    })

    it('requires a reminder time and a valid end date for recurrence', () => {
        expect(() => taskService.create({ title: '无提醒循环', recurrenceType: 'daily' })).toThrow('循环提醒需要设置提醒时间')
        expect(() =>
            taskService.create({
                title: '错误结束时间',
                remindAt: new Date(2026, 9, 22, 9, 0, 0).toISOString(),
                recurrenceType: 'daily',
                recurrenceUntil: new Date(2026, 9, 22, 8, 0, 0).toISOString()
            })
        ).toThrow('循环结束时间必须晚于首次提醒时间')
    })

    it('exports escaped UTF-8 CSV and JSON without internal paths', () => {
        taskService.create({ title: '含,逗号与"引号"', description: '第一行\n第二行' })
        const exportService = new ExportService({
            taskRepository,
            categoryRepository,
            settingsService,
            now: () => fixedNow
        })
        const csv = exportService.getCsv()
        const json = exportService.getJson()

        expect(csv.charCodeAt(0)).toBe(0xfeff)
        expect(csv).toContain('"含,逗号与""引号"""')
        expect(csv).toContain('"第一行\n第二行"')
        expect(JSON.parse(json).tasks).toHaveLength(1)
        expect(json).not.toContain(tempDir)
    })
})

describe('migration safety', () => {
    it('rejects a corrupt database during restore validation', () => {
        const corrupt = path.join(tempDir, 'corrupt.sqlite')
        fs.writeFileSync(corrupt, Buffer.alloc(1024, 7))
        expect(() => DatabaseManager.validateDatabase(corrupt)).toThrow()
    })

    it('tracks schema version in a real SQLite file', () => {
        const probe = new Database(path.join(tempDir, 'daymark.sqlite'), { readonly: true })
        expect(probe.pragma('user_version', { simple: true })).toBe(3)
        probe.close()
    })

    it('upgrades an existing version 1 database without losing tasks', () => {
        const legacyPath = path.join(tempDir, 'legacy.sqlite')
        const legacy = new Database(legacyPath)
        migrations[0].up(legacy)
        legacy
            .prepare(
                `INSERT INTO tasks (id, title, status, priority, sort_order, created_at, updated_at)
                 VALUES ('legacy-task', '旧任务', 'active', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
            )
            .run()
        legacy.pragma('user_version = 1')
        legacy.close()

        const upgraded = new DatabaseManager(legacyPath)
        upgraded.open()
        const task = upgraded.db.prepare('SELECT title, recurrence_type, recurrence_unit FROM tasks WHERE id = ?').get('legacy-task')
        const version = upgraded.db.pragma('user_version', { simple: true })
        upgraded.close()

        expect(version).toBe(3)
        expect(task).toEqual({ title: '旧任务', recurrence_type: 'none', recurrence_unit: 'day' })
    })
})
