export function openNativePicker(event) {
    const input = event.currentTarget
    if (!input || input.disabled || input.readOnly || typeof input.showPicker !== 'function') {
        return
    }
    try {
        input.showPicker()
    } catch {
        // 浏览器拒绝时保持可手动输入
    }
}
