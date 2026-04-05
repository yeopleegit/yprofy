import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex gap-3 mb-4">
        <div className="p-2 bg-red-50 rounded-lg shrink-0 h-fit">
          <AlertTriangle size={20} className="text-red-600" />
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
