import { CheckCircle2, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
const DURATION_MS = 3000

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current)
    setToast({ message, type, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-24 z-[70] flex justify-center px-4">
        {toast && (
          <p
            key={toast.key}
            className={`pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-xl ${
              toast.type === 'error' ? 'bg-blush-600' : 'bg-brand-700'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="size-5" aria-hidden /> : <CheckCircle2 className="size-5" aria-hidden />}
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
