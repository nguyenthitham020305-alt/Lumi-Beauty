import { SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard, { ProductCardSkeleton } from '../components/product/ProductCard'
import ProductFilters, { describePrice, parseBrands } from '../components/product/ProductFilters'
import Breadcrumb from '../components/ui/Breadcrumb'
import Pagination from '../components/ui/Pagination'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'

const PER_PAGE = 20
const FILTER_KEYS = ['q', 'category', 'brand', 'min_price', 'max_price', 'in_stock']
const SORT_OPTIONS = [
  { value: 'bestseller', label: 'Phổ biến nhất' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
]

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? undefined]))
  const sort = searchParams.get('sort') ?? 'bestseller'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const queryKey = searchParams.toString()

  const { data, loading, error } = useFetch(
    () => api.productList({ ...filters, sort, page, per_page: PER_PAGE }),
    [queryKey],
  )
  const { data: categoryData } = useFetch(() => api.categories())
  const { data: brandData } = useFetch(() => api.brands())

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const update = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => (v === undefined || v === '' ? next.delete(k) : next.set(k, v)))
    if (resetPage) next.delete('page')
    setSearchParams(next)
    setDrawerOpen(false)
  }

  const goToPage = (p) => {
    update({ page: p === 1 ? undefined : String(p) }, { resetPage: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const items = data?.items ?? []
  const pagination = data?.pagination
  const category = categoryData?.items.find((c) => c.slug === filters.category)
  const selectedBrands = parseBrands(filters.brand)
  const brandName = (slug) => brandData?.items.find((b) => b.slug === slug)?.name ?? slug

  const title = filters.q
    ? `Kết quả cho “${filters.q}”`
    : (category?.name ?? (selectedBrands.length === 1 ? `Thương hiệu ${brandName(selectedBrands[0])}` : 'Tất cả sản phẩm'))

  const chips = [
    filters.q && { key: 'q', label: `Từ khoá: ${filters.q}` },
    category && { key: 'category', label: category.name },
    ...selectedBrands.map((slug) => ({
      key: `brand-${slug}`,
      label: brandName(slug),
      clear: { brand: selectedBrands.filter((s) => s !== slug).join(',') || undefined },
    })),
    (filters.min_price || filters.max_price) && {
      key: 'price',
      label: describePrice(filters.min_price, filters.max_price),
      clear: { min_price: undefined, max_price: undefined },
    },
    filters.in_stock && { key: 'in_stock', label: 'Còn hàng' },
  ].filter(Boolean)

  return (
    <div className="container-page py-6">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, ...(category ? [{ label: 'Sản phẩm', to: '/products' }] : []), { label: title }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination ? `${pagination.total.toLocaleString('vi-VN')} sản phẩm` : 'Đang tải...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-brand-300 lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden /> Bộ lọc
            {chips.length > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-xs text-white">{chips.length}</span>
            )}
          </button>
          <label htmlFor="sort" className="sr-only">
            Sắp xếp
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => update({ sort: e.target.value === 'bestseller' ? undefined : e.target.value })}
            className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-brand-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => update(chip.clear ?? { [chip.key]: undefined })}
              className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 hover:bg-brand-100"
              aria-label={`Bỏ lọc ${chip.label}`}
            >
              {chip.label} <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))}
            className="text-sm text-slate-500 underline-offset-2 hover:text-blush-600 hover:underline"
          >
            Xoá tất cả
          </button>
        </div>
      )}

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block" aria-label="Bộ lọc sản phẩm">
          <div className="sticky top-40 rounded-2xl border border-slate-100 p-5">
            <ProductFilters filters={filters} onChange={update} />
          </div>
        </aside>

        <section className="min-w-0 flex-1" aria-label="Danh sách sản phẩm">
          {error ? (
            <p className="rounded-2xl bg-blush-50 p-6 text-center text-sm text-blush-600">Không tải được sản phẩm: {error.message}</p>
          ) : !loading && items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <img src="/images/logo-mark.png" alt="" className="mx-auto size-24 opacity-70" />
              <p className="mt-3 font-semibold text-slate-700">Không tìm thấy sản phẩm phù hợp</p>
              <p className="mt-1 text-sm text-slate-500">Thử bỏ bớt bộ lọc hoặc dùng từ khoá khác nhé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
                : items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {pagination && <Pagination page={pagination.page} pages={pagination.pages} onChange={goToPage} />}
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Bộ lọc sản phẩm">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="font-semibold text-slate-800">Bộ lọc</p>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Đóng bộ lọc" className="rounded-full p-1.5 hover:bg-slate-100">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ProductFilters filters={filters} onChange={update} idPrefix="drawer" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
