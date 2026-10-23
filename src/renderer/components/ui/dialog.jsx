import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({ className, children, showClose = true, layout = false, ...props }) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="dialog-overlay" />
            <DialogPrimitive.Content className={cn('dialog-content', layout && 'dialog-content-layout', className)} {...props}>
                {children}
                {showClose && (
                    <DialogPrimitive.Close className="icon-button" style={{ position: 'absolute', top: 14, right: 14 }} aria-label="关闭">
                        <X size={16} />
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    )
}

export function DialogLayout({ title, description, header, footer, children, className, headerClassName, bodyClassName, footerClassName }) {
    return (
        <div className={cn('dialog-layout', className)}>
            {(header || title) && (
                <div className={cn('dialog-layout-header', headerClassName)}>
                    {header || (
                        <div className="dialog-header">
                            <div>
                                <DialogTitle className="dialog-title">{title}</DialogTitle>
                                {description ? <DialogDescription className="dialog-description">{description}</DialogDescription> : null}
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
