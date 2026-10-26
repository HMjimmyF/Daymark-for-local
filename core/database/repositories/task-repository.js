const TASK_SELECT = `
    SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        t.parent_id AS parentId,
        t.due_at AS dueAt,
        t.remind_at AS remindAt,
        t.reminded_at AS remindedAt,
        t.recurrence_type AS recurrenceType,
        t.recurrence_interval AS recurrenceInterval,
        t.recurrence_unit AS recurrenceUnit,
        t.recurrence_anchor_at AS recurrenceAnchorAt,
        t.recurrence_until AS recurrenceUntil,
        t.completed_at AS completedAt,
        t.sort_order AS sortOrder,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt,
        t.deleted_at AS deletedAt
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
`

function escapeLike(value) {
    return value.replace(/[\\%_]/g, '\\$&')
}

class TaskRepository {
    constructor(database) {
        this.database = database
    }

    getById(id) {
        return this.database.prepare(`${TASK_SELECT} WHERE t.id = ? AND t.deleted_at IS NULL`).get(id) ?? null
    }

    list({ view = 'all', categoryId = null, search = '', ranges }) {
        const conditions = ['t.deleted_at IS NULL']
        const parameters = []

        if (view === 'completed') {
            conditions.push("t.status = 'completed'")
        } else {
            conditions.push("t.status = 'active'")
        }

        if (view === 'inbox') {
            conditions.push('(t.category_id IS NULL OR t.due_at IS NULL)')
        } else if (view === 'today') {
            conditions.push(`(
                (t.due_at >= ? AND t.due_at < ?)
                OR (t.recurrence_type != 'none' AND t.remind_at >= ? AND t.remind_at < ?)
            )`)
            parameters.push(ranges.todayStart, ranges.tomorrowStart, ranges.todayStart, ranges.tomorrowStart)
        } else if (view === 'upcoming') {
            conditions.push(`(
                (t.due_at >= ? AND t.due_at < ?)
                OR (t.recurrence_type != 'none' AND t.remind_at >= ? AND t.remind_at < ?)
            )`)
            parameters.push(ranges.todayStart, ranges.sevenDayEnd, ranges.todayStart, ranges.sevenDayEnd)
        } else if (view === 'category') {
            conditions.push('t.category_id = ?')
            parameters.push(categoryId)
        }

        if (search.trim()) {
            conditions.push("t.title LIKE ? ESCAPE '\\'")
            parameters.push(`%${escapeLike(search.trim())}%`)
        }

        const ordering =
            view === 'completed'
                ? 'ORDER BY t.completed_at DESC, t.updated_at DESC'
                : `ORDER BY
                    CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,
                    t.due_at ASC,
                    t.priority DESC,
                    t.sort_order ASC,
                    t.created_at ASC`

        return this.database.prepare(`${TASK_SELECT} WHERE ${conditions.join(' AND ')} ${ordering}`).all(...parameters)
    }

    getChildren(parentId) {
        return this.database.prepare(`${TASK_SELECT} WHERE t.parent_id = ? AND t.deleted_at IS NULL ORDER BY t.sort_order ASC, t.created_at ASC`).all(parentId)
    }

    countByView(view, ranges) {
        if (view === 'today') {
            return this.database
                .prepare(
                    `SELECT COUNT(*) AS count
                     FROM tasks
                     WHERE status = 'active'
                       AND deleted_at IS NULL
                       AND (
                           (due_at >= ? AND due_at < ?)
                           OR (recurrence_type != 'none' AND remind_at >= ? AND remind_at < ?)
                       )`
                )
                .get(ranges.todayStart, ranges.tomorrowStart, ranges.todayStart, ranges.tomorrowStart).count
        }
        if (view === 'upcoming') {
            return this.database
                .prepare(
                    `SELECT COUNT(*) AS count
                     FROM tasks
                     WHERE status = 'active'
                       AND deleted_at IS NULL
                       AND (
                           (due_at >= ? AND due_at < ?)
                           OR (recurrence_type != 'none' AND remind_at >= ? AND remind_at < ?)
                       )`
                )
                .get(ranges.todayStart, ranges.sevenDayEnd, ranges.todayStart, ranges.sevenDayEnd).count
        }
        if (view === 'inbox') {
            return this.database
                .prepare("SELECT COUNT(*) AS count FROM tasks WHERE status = 'active' AND deleted_at IS NULL AND (category_id IS NULL OR due_at IS NULL)")
                .get().count
        }
        return this.database.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status = 'active' AND deleted_at IS NULL").get().count
    }

    getCounts(ranges) {
        return {
            inbox: this.countByView('inbox', ranges),
            today: this.countByView('today', ranges),
            upcoming: this.countByView('upcoming', ranges),
            all: this.countByView('all', ranges)
        }
    }

    create(task) {
        const nextSort = this.database.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS value FROM tasks').get().value
        this.database
            .prepare(
                `INSERT INTO tasks (
                    id, title, description, status, priority, category_id, parent_id,
                    due_at, remind_at, reminded_at, recurrence_type, recurrence_interval, recurrence_unit, recurrence_anchor_at,
                    recurrence_until, completed_at, sort_order, created_at, updated_at, deleted_at
                ) VALUES (
                    @id, @title, @description, @status, @priority, @categoryId, @parentId,
                    @dueAt, @remindAt, @remindedAt, @recurrenceType, @recurrenceInterval, @recurrenceUnit, @recurrenceAnchorAt,
                    @recurrenceUntil, @completedAt, @sortOrder, @createdAt, @updatedAt, NULL
                )`
            )
            .run({
                ...task,
                sortOrder: task.sortOrder ?? nextSort
            })
        return this.getById(task.id)
    }

    update(id, patch) {
        const columnMap = {
            title: 'title',
            description: 'description',
            status: 'status',
            priority: 'priority',
            categoryId: 'category_id',
            parentId: 'parent_id',
            dueAt: 'due_at',
            remindAt: 'remind_at',
            remindedAt: 'reminded_at',
            recurrenceType: 'recurrence_type',
            recurrenceInterval: 'recurrence_interval',
            recurrenceUnit: 'recurrence_unit',
            recurrenceAnchorAt: 'recurrence_anchor_at',
            recurrenceUntil: 'recurrence_until',
            completedAt: 'completed_at',
            sortOrder: 'sort_order',
            updatedAt: 'updated_at'
        }
        const assignments = []
        const parameters = { id }

        for (const [key, value] of Object.entries(patch)) {
            const column = columnMap[key]
            if (!column) {
                continue
            }
            assignments.push(`${column} = @${key}`)
            parameters[key] = value
        }

        if (!assignments.length) {
            return this.getById(id)
        }

        this.database.prepare(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = @id AND deleted_at IS NULL`).run(parameters)
        return this.getById(id)
    }

    softDeleteTree(id, deletedAt) {
        return this.database
            .prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE (id = ? OR parent_id = ?) AND deleted_at IS NULL')
            .run(deletedAt, deletedAt, id, id).changes
    }

    removeCategoryReference(categoryId, updatedAt) {
        return this.database
            .prepare('UPDATE tasks SET category_id = NULL, updated_at = ? WHERE category_id = ? AND deleted_at IS NULL')
            .run(updatedAt, categoryId).changes
    }

    listForExport() {
        return this.database.prepare(`${TASK_SELECT} WHERE t.deleted_at IS NULL ORDER BY t.created_at ASC`).all()
    }

    listDueReminders(nowIso) {
        return this.database
            .prepare(
                `${TASK_SELECT}
                 WHERE t.status = 'active'
                   AND t.deleted_at IS NULL
                   AND t.remind_at IS NOT NULL
                   AND t.reminded_at IS NULL
                   AND t.remind_at <= ?
                   AND NOT EXISTS (
                       SELECT 1 FROM reminder_deliveries d
                       WHERE d.task_id = t.id AND d.remind_at = t.remind_at
                   )
                 ORDER BY t.remind_at ASC`
            )
            .all(nowIso)
    }

    markReminderDelivered(taskId, remindAt, deliveredAt) {
        this.database
            .prepare('INSERT OR IGNORE INTO reminder_deliveries (task_id, remind_at, delivered_at) VALUES (?, ?, ?)')
            .run(taskId, remindAt, deliveredAt)
    }

    completeReminderOccurrence({ taskId, currentRemindAt, deliveredAt, nextRemindAt }) {
        const complete = this.database.transaction(() => {
            this.database
                .prepare('INSERT OR IGNORE INTO reminder_deliveries (task_id, remind_at, delivered_at) VALUES (?, ?, ?)')
                .run(taskId, currentRemindAt, deliveredAt)

            if (nextRemindAt === undefined) {
                this.database
                    .prepare('UPDATE tasks SET reminded_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
                    .run(deliveredAt, deliveredAt, taskId)
                return
            }

            if (nextRemindAt) {
                this.database
                    .prepare(
                        `UPDATE tasks
                         SET remind_at = ?, reminded_at = NULL, recurrence_anchor_at = COALESCE(recurrence_anchor_at, ?), updated_at = ?
                         WHERE id = ? AND remind_at = ? AND deleted_at IS NULL`
                    )
                    .run(nextRemindAt, currentRemindAt, deliveredAt, taskId, currentRemindAt)
                return
            }

            this.database
                .prepare(
                    `UPDATE tasks
                     SET remind_at = NULL,
                         reminded_at = ?,
                         recurrence_type = 'none',
                         recurrence_interval = 1,
                         recurrence_unit = 'day',
                         recurrence_anchor_at = NULL,
                         recurrence_until = NULL,
                         updated_at = ?
                     WHERE id = ? AND remind_at = ? AND deleted_at IS NULL`
                )
                .run(deliveredAt, deliveredAt, taskId, currentRemindAt)
        })
        complete()
    }
}

module.exports = {
    TaskRepository
}
