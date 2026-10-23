import { BellOff, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogLayout, DialogTitle } from '@/components/ui/dialog'

export function CompleteRecurringDialog({ task, onCancel, onConfirm }) {
    return (
        <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent layout className="recurring-complete-dialog">
                <DialogLayout
                    header={
                        <div className="confirmation-heading">
                            <span className="confirmation-icon">
                                <Repeat2 size={18} />
                                <BellOff size={12} className="confirmation-icon-badge" />
                            </span>
                            <div>
                                <DialogTitle className="dialog-title">完成这个重复待办？</DialogTitle>
                                <DialogDescription className="dialog-description">“{task?.title}”将移动到已完成列表，并停止后续重复提醒。</DialogDescription>
                            </div>
                        </div>
                    }
                    footer={
                        <>
                            <Button variant="ghost" onClick={onCancel}>
                                取消
                            </Button>
                            <Button onClick={onConfirm}>确认完成</Button>
                        </>
                    }
                >
                    <div className="confirmation-note">如果还需要继续处理，选择“取消”即可保留任务和下一次提醒。</div>
                </DialogLayout>
            </DialogContent>
        </Dialog>
    )
}
