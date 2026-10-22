class CategoryRepository {
    constructor(database) {
        this.database = database
    }

    list() {
        return this.database
            .prepare(
                `SELECT id, name, color, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
                 FROM categories
                 WHERE deleted_at IS NULL
                 ORDER BY sort_order ASC, lower(name) ASC`
            )
            .all()
    }

    getById(id) {
        return (
            this.database
                .prepare(
                    `SELECT id, name, color, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
                     FROM categories WHERE id = ? AND deleted_at IS NULL`
                )
                .get(id) ?? null
        )
    }

    findByName(name) {
        return this.database.prepare('SELECT id FROM categories WHERE lower(name) = lower(?) AND deleted_at IS NULL').get(name) ?? null
    }

    create(category) {
        const nextSort = this.database.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS value FROM categories').get().value
        this.database
            .prepare(
                `INSERT INTO categories (id, name, color, sort_order, created_at, updated_at, deleted_at)
                 VALUES (@id, @name, @color, @sortOrder, @createdAt, @updatedAt, NULL)`
            )
            .run({ ...category, sortOrder: category.sortOrder ?? nextSort })
        return this.getById(category.id)
    }

    update(id, patch) {
        const fields = []
        const parameters = { id }
        for (const [key, column] of Object.entries({ name: 'name', color: 'color', updatedAt: 'updated_at' })) {
            if (Object.hasOwn(patch, key)) {
                fields.push(`${column} = @${key}`)
                parameters[key] = patch[key]
            }
        }
        if (!fields.length) {
            return this.getById(id)
        }
        this.database.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`).run(parameters)
        return this.getById(id)
    }

    deleteAndDetach(id, updatedAt) {
        const run = this.database.transaction(() => {
            const movedTasks = this.database
                .prepare('UPDATE tasks SET category_id = NULL, updated_at = ? WHERE category_id = ? AND deleted_at IS NULL')
                .run(updatedAt, id).changes
            const deletedCategories = this.database
                .prepare('UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
                .run(updatedAt, updatedAt, id).changes
            return { movedTasks, deletedCategories }
        })
        return run()
    }
}

module.exports = {
    CategoryRepository
}
