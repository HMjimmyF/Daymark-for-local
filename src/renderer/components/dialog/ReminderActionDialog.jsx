import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogLayout, DialogTitle } from '@/components/ui/dialog'

export function ReminderActionDialog({ task, busy = false, onDismiss, onComplete, onOpenDetails }) {
    return (
        <Dialog open={Boolean(task)} onOpenChange={(open) => !open && !busy && onDismiss()}>
            <DialogContent layout className="reminder-action-dialog">
                <DialogLayout
                    header={
                        <div className="confirmation-heading">
                            <span className="confirmation-icon">
                                <BellRing size={18} />
                            </span>
                            <div>
                                <DialogTitle className="dialog-title">待办提醒</DialogTitle>
                                <DialogDescription className="dialog-description">{task?.title}</DialogDescription>
                            </div>
                        </div>
                    }
                    footer={
                        <>
                            <Button variant="ghost" onClick={onComplete} disabled={busy}>
                                标记已完成
                            </Button>
                            <Button onClick={onOpenDetails} disabled={busy}>
                                打开详情
                            </Button>
                        </>
                    }
                >
                    <p className="reminder-action-description">{task?.description || '此待办没有描述。'}</p>
                    <p className="reminder-action-hint">关闭弹窗不会改变提醒状态：该待办保持“已提醒”。</p>
                </DialogLayout>
            </DialogContent>
        </Dialog>
    )
}
