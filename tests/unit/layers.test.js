import { describe, expect, it } from 'vitest'
import { DIALOG_LAYER, MAX_DRAWER_DEPTH, layerZIndex } from '../../src/renderer/components/ui/layers'

describe('overlay layers', () => {
    it('stacks drawers by depth', () => {
        expect(layerZIndex(1)).toBeLessThan(layerZIndex(2))
        expect(layerZIndex(2)).toBeLessThan(layerZIndex(3))
    })

    it('treats a missing or invalid depth as the first drawer', () => {
        expect(layerZIndex(0)).toBe(layerZIndex(1))
        expect(layerZIndex(undefined)).toBe(layerZIndex(1))
        expect(layerZIndex(-4)).toBe(layerZIndex(1))
    })

    it('places dialogs above every drawer so nested confirmations stay clickable', () => {
        expect(layerZIndex(DIALOG_LAYER)).toBeGreaterThan(layerZIndex(MAX_DRAWER_DEPTH))
        expect(layerZIndex(DIALOG_LAYER) + 1).toBeGreaterThan(layerZIndex(MAX_DRAWER_DEPTH) + 1)
    })
})
