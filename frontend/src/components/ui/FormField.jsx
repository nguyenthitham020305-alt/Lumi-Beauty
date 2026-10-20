import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function FormField({ id, label, error, type = 'text', ...props }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          placeholder={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            isPassword ? 'pr-11' : ''
          } ${error ? 'border-blush-400 focus:ring-blush-100' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-brand-600"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 pl-1 text-xs text-blush-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function SelectField({ id, label, error, children, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full appearance-none rounded-xl border bg-white pr-10 pl-4 text-sm outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
            error ? 'border-blush-400 focus:ring-blush-100' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
          }`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 pl-1 text-xs text-blush-600">
          {error}
        </p>
      )}
    </div>
  )
}
