import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/** items: [{ label, to? }] — mục cuối là trang hiện tại, không có link */
export default function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-slate-300" aria-hidden />}
            {item.to ? (
              <Link to={item.to} className="hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="line-clamp-1 text-slate-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
