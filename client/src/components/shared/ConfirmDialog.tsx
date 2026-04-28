import Modal from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmLabel = '삭제', onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-graphite dark:text-pale leading-relaxed mb-8">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="h-10 px-6 min-w-[120px] text-sm font-medium text-graphite dark:text-pale bg-canvas dark:bg-surface-dark-alt rounded-[4px] border border-pale dark:border-surface-dark-alt hover:bg-ash dark:hover:bg-surface-dark"
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          className="h-10 px-6 min-w-[120px] text-sm font-medium text-canvas dark:text-carbon bg-carbon dark:bg-canvas rounded-[4px] hover:bg-graphite dark:hover:bg-pale"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
