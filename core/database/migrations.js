const migrations = [
    {
        version: 1,
        name: 'initial-schema',
        up(database) {
            database.exec(`
                CREATE TABLE categories (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT,
                    sort_order REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT
                );

                CREATE TABLE tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
                    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
                    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
                    due_at TEXT,
                    remind_at TEXT,
                    completed_at TEXT,
                    sort_order REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT
                );

                CREATE TABLE settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE reminder_deliveries (
                    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                    remind_at TEXT NOT NULL,
                    delivered_at TEXT NOT NULL,
                    PRIMARY KEY (task_id, remind_at)
                );

                CREATE UNIQUE INDEX idx_categories_active_name
                    ON categories(lower(name))
                    WHERE deleted_at IS NULL;
                CREATE INDEX idx_tasks_status_due ON tasks(status, due_at);
                CREATE INDEX idx_tasks_category_status ON tasks(category_id, status);
                CREATE INDEX idx_tasks_parent_sort ON tasks(parent_id, sort_order);
                CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);
                CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
                CREATE INDEX idx_tasks_remind_at ON tasks(remind_at, status, deleted_at);
            `)
        }
    },
    {
        version: 2,
        name: 'recurring-reminders',
        up(database) {
            database.exec(`
                ALTER TABLE tasks ADD COLUMN recurrence_type TEXT NOT NULL DEFAULT 'none'
                    CHECK (recurrence_type IN ('none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom'));
                ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER NOT NULL DEFAULT 1
                    CHECK (recurrence_interval BETWEEN 1 AND 365);
                ALTER TABLE tasks ADD COLUMN recurrence_anchor_at TEXT;
                ALTER TABLE tasks ADD COLUMN recurrence_until TEXT;

                CREATE INDEX idx_tasks_recurring_next
                    ON tasks(status, remind_at, deleted_at)
                    WHERE recurrence_type != 'none';
            `)
        }
    },
    {
        version: 3,
        name: 'custom-recurrence-units',
        up(database) {
            database.exec(`
                ALTER TABLE tasks ADD COLUMN recurrence_unit TEXT NOT NULL DEFAULT 'day'
                    CHECK (recurrence_unit IN ('day', 'month', 'year'));
            `)
        }
    },
    {
        version: 4,
        name: 'reminded-state-and-sub-day-recurrence',
        rebuildsTasks: true,
        up(database) {
            database.exec(`
                CREATE TABLE tasks_migrated (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
                    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
                    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
                    due_at TEXT,
                    remind_at TEXT,
                    reminded_at TEXT,
                    recurrence_type TEXT NOT NULL DEFAULT 'none'
                        CHECK (recurrence_type IN ('none', 'minutely', 'hourly', 'daily', 'weekdays', 'weekly', 'monthly', 'custom')),
                    recurrence_interval INTEGER NOT NULL DEFAULT 1
                        CHECK (recurrence_interval BETWEEN 1 AND 10080),
                    recurrence_unit TEXT NOT NULL DEFAULT 'day'
                        CHECK (recurrence_unit IN ('minute', 'hour', 'day', 'month', 'year')),
                    recurrence_anchor_at TEXT,
                    recurrence_until TEXT,
                    completed_at TEXT,
                    sort_order REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT
                );

                INSERT INTO tasks_migrated (
                    id, title, description, status, priority, category_id, parent_id,
                    due_at, remind_at, reminded_at, recurrence_type, recurrence_interval, recurrence_unit,
                    recurrence_anchor_at, recurrence_until, completed_at, sort_order, created_at, updated_at, deleted_at
                )
                SELECT
                    id, title, description, status, priority, category_id, parent_id,
                    due_at, remind_at, NULL, recurrence_type, recurrence_interval, recurrence_unit,
                    recurrence_anchor_at, recurrence_until, completed_at, sort_order, created_at, updated_at, deleted_at
                FROM tasks;

                DROP TABLE tasks;
                ALTER TABLE tasks_migrated RENAME TO tasks;

                CREATE INDEX idx_tasks_status_due ON tasks(status, due_at);
                CREATE INDEX idx_tasks_category_status ON tasks(category_id, status);
                CREATE INDEX idx_tasks_parent_sort ON tasks(parent_id, sort_order);
                CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);
                CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
                CREATE INDEX idx_tasks_remind_at ON tasks(remind_at, status, deleted_at);
                CREATE INDEX idx_tasks_recurring_next
                    ON tasks(status, remind_at, deleted_at)
                    WHERE recurrence_type != 'none';
            `)
        }
    }
]

function applyMigrations(database) {
    const currentVersion = database.pragma('user_version', { simple: true })
    const pending = migrations.filter((migration) => migration.version > currentVersion)

    for (const migration of pending) {
        const rebuildsTasks = migration.rebuildsTasks === true
        if (rebuildsTasks) {
            // 重建任务表时先关闭外键，避免 DROP TABLE 级联清除提醒投递记录。
            database.pragma('foreign_keys = OFF')
        }

        const run = database.transaction(() => {
            migration.up(database)
            database.pragma(`user_version = ${migration.version}`)
        })

        try {
            run()
        } catch (error) {
            throw new Error(`数据库迁移 ${migration.version} (${migration.name}) 失败: ${error.message}`)
        } finally {
            if (rebuildsTasks) {
                database.pragma('foreign_keys = ON')
            }
        }

        if (rebuildsTasks) {
            const violations = database.pragma('foreign_key_check')
            if (violations.length) {
                throw new Error(`数据库迁移 ${migration.version} (${migration.name}) 导致外键不一致`)
            }
        }
    }

    return {
        from: currentVersion,
        to: database.pragma('user_version', { simple: true }),
        applied: pending.map((migration) => migration.version)
    }
}

module.exports = {
    LATEST_SCHEMA_VERSION: migrations.at(-1)?.version ?? 0,
    applyMigrations,
    migrations
}
