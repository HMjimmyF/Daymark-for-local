import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { layerZIndex } from '@/components/ui/layers'

export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close
export const DrawerTitle = DialogPrimitive.Title
export const DrawerDescription = DialogPrimitive.Description

export function DrawerContent({ className, children, side = 'right', depth = 1, showClose = true, closeLabel = '关闭', style, ...props }) {
    const zIndex = layerZIndex(depth)
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="dialog-overlay drawer-overlay" style={{ zIndex }} />
            <DialogPrimitive.Content className={cn('drawer-content', `drawer-${side}`, className)} style={{ zIndex: zIndex + 1, ...style }} {...props}>
                {children}
                {showClose && (
                    <DialogPrimitive.Close className="icon-button drawer-close" aria-label={closeLabel}>
                        <X size={16} />
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    )
}

/** 抽屉内部结构，与 `DialogLayout` 共用排版类名，保证各弹层的行为与视觉一致。 */
export function DrawerLayout({ title, description, header, footer, children, className, headerClassName, bodyClassName, footerClassName }) {
    return (
        <div className={cn('dialog-layout drawer-layout', className)}>
            {(header || title) && (
                <div className={cn('dialog-layout-header', headerClassName)}>
                    {header || (
                        <div className="dialog-header">
                            <div>
                                <DrawerTitle className="dialog-title">{title}</DrawerTitle>
                                {description ? <DrawerDescription className="dialog-description">{description}</DrawerDescription> : null}
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className={cn('dialog-layout-body', bodyClassName)}>{children}</div>
            {footer ? <div className={cn('dialog-layout-footer', footerClassName)}>{footer}</div> : null}
        </div>
    )
}
