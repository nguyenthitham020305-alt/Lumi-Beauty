import { CalendarRange } from 'lucide-react'
import { useEffect, useState } from 'react'

const PRESETS = [
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: 'month', label: 'Tháng này' },
  { key: 'custom', label: 'Tuỳ chỉnh' },
]

const today = () => new Date().toISOString().slice(0, 10)

/** Bộ lọc thời gian — đặt thành MỘT hàng ngay trên các biểu đồ. */
export default function RangeFilter({ value, from, to, onChange }) {
  const [draftFrom, setDraftFrom] = useState(from || '')
  const [draftTo, setDraftTo] = useState(to || today())

  useEffect(() => {
    if (from) setDraftFrom(from)
    if (to) setDraftTo(to)
  }, [from, to])

  const applyCustom = (e) => {
    e.preventDefault()
    if (draftFrom && draftTo) onChange('custom', draftFrom, draftTo)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <CalendarRange className="size-4" aria-hidden /> Khoảng thời gian
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Chọn khoảng thời gian">
        {PRESETS.map((p) => {
          const active = value === p.key
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => (p.key === 'custom' ? onChange('custom', draftFrom || draftTo, draftTo) : onChange(p.key))}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {value === 'custom' && (
        <form onSubmit={applyCustom} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="range-from">
            Từ ngày
          </label>
          <input
            id="range-from"
            type="date"
            value={draftFrom}
            max={draftTo || today()}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <span className="text-sm text-slate-400">→</span>
          <label className="sr-only" htmlFor="range-to">
            Đến ngày
          </label>
          <input
            id="range-to"
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            onChange={(e) => setDraftTo(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!draftFrom || !draftTo}
            className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Áp dụng
          </button>
        </form>
      )}
    </div>
  )
}
