import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export function DropdownMenuContent(props) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content className="menu-content" sideOffset={5} {...props} />
        </DropdownMenuPrimitive.Portal>
    )
}

export function DropdownMenuItem({ className = '', ...props }) {
    return <DropdownMenuPrimitive.Item className={`menu-item ${className}`} {...props} />
}

export const DropdownMenuSeparator = () => <DropdownMenuPrimitive.Separator className="menu-separator" />
