import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ open, title, confirmLabel = 'Xác nhận', danger = false, busy = false, onConfirm, onClose, children }) {
  const cancelRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = busy ? () => {} : onClose

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => closeRef.current()} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="relative my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex gap-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${danger ? 'bg-blush-50 text-blush-600' : 'bg-brand-50 text-brand-600'}`}>
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <div className="mt-2 text-sm text-slate-600">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? 'bg-blush-600 hover:bg-blush-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
