const { z } = require('zod')

const idSchema = z.string().uuid('任务或分类标识无效')
const isoDateSchema = z.string().datetime({ offset: true, message: '日期格式无效' }).nullable()
const titleSchema = z.string().trim().min(1, '任务标题不能为空').max(200, '任务标题不能超过 200 个字符')
const descriptionSchema = z.string().max(5000, '描述不能超过 5000 个字符').nullable()

const taskInputSchema = z.object({
    title: titleSchema,
    description: descriptionSchema.optional().default(null),
    priority: z.number().int().min(0).max(3).optional().default(0),
    categoryId: idSchema.nullable().optional().default(null),
    parentId: idSchema.nullable().optional().default(null),
    dueAt: isoDateSchema.optional().default(null),
    remindAt: isoDateSchema.optional().default(null)
})

const taskPatchSchema = z
    .object({
        title: titleSchema.optional(),
        description: descriptionSchema.optional(),
        priority: z.number().int().min(0).max(3).optional(),
        categoryId: idSchema.nullable().optional(),
        parentId: idSchema.nullable().optional(),
        dueAt: isoDateSchema.optional(),
        remindAt: isoDateSchema.optional()
    })
    .refine((value) => Object.keys(value).length > 0, '没有需要更新的内容')

const taskListSchema = z.object({
    view: z.enum(['inbox', 'today', 'upcoming', 'all', 'completed', 'category']).default('all'),
    categoryId: idSchema.nullable().optional().default(null),
    search: z.string().max(200).optional().default('')
})

const categoryInputSchema = z.object({
    name: z.string().trim().min(1, '分类名称不能为空').max(40, '分类名称不能超过 40 个字符'),
    color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, '分类颜色格式无效')
        .nullable()
        .optional()
        .default(null)
})

const categoryPatchSchema = z
    .object({
        name: z.string().trim().min(1, '分类名称不能为空').max(40, '分类名称不能超过 40 个字符').optional(),
        color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/, '分类颜色格式无效')
            .nullable()
            .optional()
    })
    .refine((value) => Object.keys(value).length > 0, '没有需要更新的内容')

const settingsPatchSchema = z
    .object({
        theme: z.enum(['system', 'light', 'dark']).optional(),
        closeToTray: z.boolean().optional(),
        startMinimized: z.boolean().optional(),
        reminderEnabled: z.boolean().optional(),
        toggleShortcut: z.string().trim().min(1).max(80).optional(),
        quickAddShortcut: z.string().trim().min(1).max(80).optional(),
        backupDirectory: z.string().max(1024).nullable().optional()
    })
    .refine((value) => Object.keys(value).length > 0, '没有需要更新的设置')

module.exports = {
    categoryInputSchema,
    categoryPatchSchema,
    idSchema,
    settingsPatchSchema,
    taskInputSchema,
    taskListSchema,
    taskPatchSchema
}
