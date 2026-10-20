import { Minus, Plus } from 'lucide-react'

const SIZES = {
  md: { box: 'h-11', btn: 'size-11', input: 'w-12', icon: 'size-4' },
  sm: { box: 'h-8', btn: 'size-8', input: 'w-9 text-sm', icon: 'size-3.5' },
}

export default function QuantityStepper({ value, max, onChange, disabled, id = 'quantity', size = 'md', label = 'Số lượng' }) {
  const s = SIZES[size]
  const clamp = (n) => Math.min(Math.max(1, n), Math.max(1, max))
  return (
    <div className={`flex w-fit items-center rounded-full border border-slate-200 ${s.box} ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Giảm số lượng"
        className={`grid place-items-center rounded-full text-slate-600 hover:text-brand-600 disabled:opacity-40 ${s.btn}`}
      >
        <Minus className={s.icon} aria-hidden />
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || 1))}
        className={`bg-transparent text-center font-semibold text-slate-800 outline-none ${s.input}`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Tăng số lượng"
        className={`grid place-items-center rounded-full text-slate-600 hover:text-brand-600 disabled:opacity-40 ${s.btn}`}
      >
        <Plus className={s.icon} aria-hidden />
      </button>
    </div>
  )
}
