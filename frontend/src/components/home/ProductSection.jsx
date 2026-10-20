import { useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import ProductCard, { ProductCardSkeleton } from '../product/ProductCard'
import SectionHeading from './SectionHeading'

const LIMIT = 10

/**
 * Khối sản phẩm có tab lọc theo danh mục.
 * tabs: [{ label, category? }] — category là slug, bỏ trống = tất cả.
 */
export default function ProductSection({ id, title, subtitle, sort, tabs, viewAllTo, tone = 'white' }) {
  const [active, setActive] = useState(0)
  const category = tabs[active]?.category
  const { data, loading, error } = useFetch(() => api.products({ sort, category, limit: LIMIT }), [sort, category])
  const items = data?.items ?? []

  return (
    <section
      className={`mt-14 py-10 ${tone === 'tinted' ? 'bg-gradient-to-b from-brand-50/70 to-white' : ''}`}
      aria-labelledby={id}
    >
      <div className="container-page">
        <SectionHeading title={<span id={id}>{title}</span>} subtitle={subtitle} to={viewAllTo} />

        <div role="tablist" aria-label={`Lọc ${title}`} className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                i === active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="rounded-2xl bg-blush-50 p-6 text-center text-sm text-blush-600">
            Không tải được sản phẩm. Vui lòng thử lại sau.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5" role="tabpanel">
            {loading
              ? Array.from({ length: LIMIT }, (_, i) => <ProductCardSkeleton key={i} />)
              : items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">Chưa có sản phẩm trong mục này.</p>
        )}
      </div>
    </section>
  )
}
