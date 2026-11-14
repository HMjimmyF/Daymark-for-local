// 弹层层级：每层占用 10 个 z-index，遮罩取 base、面板取 base + 1。
// 抽屉按 depth 递增堆叠（日程抽屉 1 层、任务详情 2 层），对话框固定在所有抽屉之上，
// 这样从抽屉里触发的确认弹窗不会被抽屉盖住。
export const LAYER_BASE = 50
export const LAYER_STEP = 10
export const MAX_DRAWER_DEPTH = 3
export const DIALOG_LAYER = MAX_DRAWER_DEPTH + 1

export function layerZIndex(depth = 1) {
    return LAYER_BASE + Math.max(1, depth) * LAYER_STEP
}
