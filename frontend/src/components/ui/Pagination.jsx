import { ChevronLeft, ChevronRight } from 'lucide-react'

// [1, '…', 4, 5, 6, '…', 20]
function pageItems(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…', p] : [p]))
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  const base = 'grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-medium transition'

  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
        className={`${base} border border-slate-200 text-slate-600 hover:border-brand-300 disabled:opacity-40`}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pageItems(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${base} ${
              p === page ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Trang sau"
        className={`${base} border border-slate-200 text-slate-600 hover:border-brand-300 disabled:opacity-40`}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  )
}
