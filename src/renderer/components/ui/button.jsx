import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export function Button({ className, variant = 'primary', size = 'default', asChild = false, ...props }) {
    const Component = asChild ? Slot : 'button'
    const variantClass =
        variant === 'secondary' ? 'secondary' : variant === 'ghost' ? 'ghost' : variant === 'danger' ? 'danger' : variant === 'danger-soft' ? 'danger-soft' : ''
    return <Component type={asChild ? undefined : 'button'} className={cn('button', variantClass, size === 'icon' && 'icon-button', className)} {...props} />
}
