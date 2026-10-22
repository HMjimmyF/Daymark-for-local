const { randomUUID } = require('node:crypto')
const { categoryInputSchema, categoryPatchSchema, idSchema } = require('../validation/task-schemas')

class CategoryService {
    constructor({ categoryRepository, now = () => new Date() }) {
        this.categoryRepository = categoryRepository
        this.now = now
    }

    list() {
        return this.categoryRepository.list()
    }

    create(input) {
        const parsed = categoryInputSchema.parse(input)
        if (this.categoryRepository.findByName(parsed.name)) {
            throw new Error('已存在同名分类')
        }
        const timestamp = this.now().toISOString()
        return this.categoryRepository.create({
            ...parsed,
            id: randomUUID(),
            name: parsed.name.trim(),
            createdAt: timestamp,
            updatedAt: timestamp
        })
    }

    update(id, patch) {
        const validId = idSchema.parse(id)
        const parsed = categoryPatchSchema.parse(patch)
        if (!this.categoryRepository.getById(validId)) {
            throw new Error('分类不存在')
        }
        if (parsed.name) {
            const duplicate = this.categoryRepository.findByName(parsed.name)
            if (duplicate && duplicate.id !== validId) {
                throw new Error('已存在同名分类')
            }
        }
        return this.categoryRepository.update(validId, {
            ...parsed,
            ...(parsed.name ? { name: parsed.name.trim() } : {}),
            updatedAt: this.now().toISOString()
        })
    }

    remove(id) {
        const validId = idSchema.parse(id)
        if (!this.categoryRepository.getById(validId)) {
            throw new Error('分类不存在')
        }
        return this.categoryRepository.deleteAndDetach(validId, this.now().toISOString())
    }
}

module.exports = {
    CategoryService
}
