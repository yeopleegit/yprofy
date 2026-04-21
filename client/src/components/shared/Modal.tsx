import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(128,128,128,0.65)' }}
        onClick={onClose}
      />
      <div className="relative bg-canvas dark:bg-surface-dark rounded-[4px] w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-base font-medium text-carbon dark:text-canvas">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-[4px] text-pewter hover:text-carbon dark:text-silver dark:hover:text-canvas">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}
