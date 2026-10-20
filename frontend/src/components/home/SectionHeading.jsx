import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SectionHeading({ title, subtitle, to, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900 md:text-[28px]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {children}
        {to && (
          <Link to={to} className="flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
            Xem tất cả <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}
