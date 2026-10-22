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
    }
]

function applyMigrations(database) {
    const currentVersion = database.pragma('user_version', { simple: true })
    const pending = migrations.filter((migration) => migration.version > currentVersion)

    for (const migration of pending) {
        const run = database.transaction(() => {
            migration.up(database)
            database.pragma(`user_version = ${migration.version}`)
        })

        try {
            run()
        } catch (error) {
            throw new Error(`数据库迁移 ${migration.version} (${migration.name}) 失败: ${error.message}`)
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
