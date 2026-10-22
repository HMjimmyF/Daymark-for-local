import { useEffect } from 'react'

export function useTheme(theme) {
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const apply = () => {
            const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme || 'light'
            document.documentElement.dataset.theme = resolved
        }
        apply()
        media.addEventListener('change', apply)
        return () => media.removeEventListener('change', apply)
    }, [theme])
}
