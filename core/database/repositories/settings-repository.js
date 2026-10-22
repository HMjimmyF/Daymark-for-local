class SettingsRepository {
    constructor(database) {
        this.database = database
    }

    getAllRaw() {
        const rows = this.database.prepare('SELECT key, value FROM settings').all()
        return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]))
    }

    setMany(values, updatedAt) {
        const statement = this.database.prepare(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        const run = this.database.transaction(() => {
            for (const [key, value] of Object.entries(values)) {
                statement.run(key, JSON.stringify(value), updatedAt)
            }
        })
        run()
    }
}

module.exports = {
    SettingsRepository
}
