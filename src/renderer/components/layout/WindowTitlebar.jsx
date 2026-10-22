import { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { api } from '@/services/daymark'

export function WindowTitlebar() {
    const [maximized, setMaximized] = useState(false)

    useEffect(() => {
        api.windows
            .getState()
            .then((state) => setMaximized(state.maximized))
            .catch(() => {})
        return api.onMaximizedChanged((state) => setMaximized(state.maximized))
    }, [])

    return (
        <div className="window-titlebar">
            <div className="window-drag-region" aria-hidden="true">
                <span className="window-drag-mark" />
                <span>DAYMARK</span>
            </div>
            <div className="window-controls">
                <button type="button" className="window-control" onClick={() => api.windows.minimize()} aria-label="最小化窗口">
                    <Minus size={15} strokeWidth={1.7} />
                </button>
                <button
                    type="button"
                    className="window-control"
                    onClick={() => api.windows.toggleMaximize()}
                    aria-label={maximized ? '还原窗口' : '最大化窗口'}
                >
                    {maximized ? <Copy size={13} strokeWidth={1.7} /> : <Square size={12} strokeWidth={1.6} />}
                </button>
                <button type="button" className="window-control close" onClick={() => api.windows.close()} aria-label="关闭窗口">
                    <X size={16} strokeWidth={1.7} />
                </button>
            </div>
        </div>
    )
}
