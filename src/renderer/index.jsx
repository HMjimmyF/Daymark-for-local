import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { Providers } from '@/app/providers'
import { QuickAddApp } from '@/features/quick-add/QuickAddApp'
import '@/styles/globals.css'

const isQuickAdd = window.location.hash.includes('quick-add')
const root = createRoot(document.getElementById('root'))

root.render(<Providers>{isQuickAdd ? <QuickAddApp /> : <App />}</Providers>)
