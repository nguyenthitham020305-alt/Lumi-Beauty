import { ExternalLink, Loader2, Package, PackageSearch, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductFormModal from './ProductFormModal'
import ConfirmDialog from '../ui/ConfirmDialog'
import Pagination from '../ui/Pagination'
import { useToast } from '../ui/Toast'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { formatPrice, sizedImage } from '../../lib/format'

const SEARCH_DEBOUNCE_MS = 400
const STATUS_TABS = ['', 'active', 'out_of_stock', 'hidden']

const STATUS_LABEL = { active: 'Đang bán', out_of_stock: 'Hết hàng', hidden: 'Đang ẩn' }
const STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700',
  out_of_stock: 'bg-amber-50 text-amber-700',
  hidden: 'bg-slate-100 text-slate-500',
}

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

function Badge({ className, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>{children}</span>
}

function StockText({ stock }) {
  const tone = stock === 0 ? 'text-blush-600' : stock <= 10 ? 'text-amber-600' : 'text-slate-700'
  return <span className={`font-semibold ${tone}`}>{stock}</span>
}

export default function ProductsPanel() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    status: params.get('status') ?? '',
    sort: params.get('sort') ?? 'newest',
    page: Number(params.get('page')) || 1,
  }
  const [searchText, setSearchText] = useState(filters.q)
  const [reloadKey, setReloadKey] = useState(0)
  const [categories, setCategories] = useState([])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const { data, loading, error } = useFetch(() => api.adminProducts(filters), [params.toString(), reloadKey])

  useEffect(() => {
    api.categories().then((r) => setCategories(r.items ?? [])).catch(() => {})
  }, [])

  const updateFilters = (patch) => {
    const next = { ...filters, page: 1, ...patch }
    const search = new URLSearchParams()
    if (next.q) search.set('q', next.q)
    if (next.category) search.set('category', next.category)
    if (next.status) search.set('status', next.status)
    if (next.sort !== 'newest') search.set('sort', next.sort)
    if (next.page > 1) search.set('page', next.page)
    setParams(search, { replace: true })
  }

  useEffect(() => {
    if (searchText.trim() === filters.q) return
    const timer = setTimeout(() => updateFilters({ q: searchText.trim() }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  const reload = () => setReloadKey((k) => k + 1)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (product) => {
    setEditing(product)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      const res = await api.deleteProduct(deleting.id)
      toast(`Đã xoá "${res.name}"`)
      setDeleting(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const counts = data?.status_counts ?? {}
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const products = data?.items ?? []

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="size-4" aria-hidden /> Thêm sản phẩm
        </button>
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Lọc theo trạng thái sản phẩm">
        {STATUS_TABS.map((s) => {
          const active = filters.status === s
          return (
            <button
              key={s || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => updateFilters({ status: s })}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {s ? STATUS_LABEL[s] : 'Tất cả'}
              <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {s ? (counts[s] ?? 0) : allCount}
              </span>
            </button>
          )
        })}
      </div>

      <section className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Tìm theo tên hoặc SKU</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc SKU..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <select aria-label="Lọc theo danh mục" value={filters.category} onChange={(e) => updateFilters({ category: e.target.value })} className={selectClass}>
              <option value="">Mọi danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select aria-label="Sắp xếp" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })} className={selectClass}>
              <option value="newest">Mới nhất</option>
              <option value="name">Tên A → Z</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="stock_asc">Tồn kho ít nhất</option>
            </select>
          </div>
        </div>

        {error ? (
          <p className="m-4 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error.message}</p>
        ) : !data ? (
          <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải sản phẩm...
          </p>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <PackageSearch className="mx-auto size-12 text-slate-300" aria-hidden />
            <p className="mt-3 font-semibold text-slate-700">Không có sản phẩm phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Thử đổi từ khoá hoặc bỏ bớt bộ lọc.</p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
            {/* Bảng cho màn hình lớn */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sản phẩm</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">SKU</th>
                    <th className="px-4 py-3 font-medium">Danh mục</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Giá gốc</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Giá bán</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Tồn kho</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={sizedImage(p.image, 100)}
                            alt=""
                            loading="lazy"
                            className="size-12 shrink-0 rounded-lg border border-slate-100 bg-slate-50 object-contain"
                          />
                          <div className="min-w-0 max-w-[280px]">
                            <p className="truncate font-medium text-slate-800" title={p.name}>
                              {p.name}
                            </p>
                            {p.brand && <p className="truncate text-xs text-brand-600">{p.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{p.sku || '—'}</td>
                      <td className="max-w-[180px] px-4 py-3">
                        <p className="truncate text-xs text-slate-600" title={p.categories.map((c) => c.name).join(', ')}>
                          {p.categories.map((c) => c.name).join(', ') || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500">
                        {p.discount_percent > 0 ? <s>{formatPrice(p.original_price)}</s> : formatPrice(p.original_price)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{formatPrice(p.price)}</span>
                        {p.discount_percent > 0 && <span className="ml-1 text-xs font-semibold text-blush-600">-{p.discount_percent}%</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <StockText stock={p.stock} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_STYLE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/products/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Xem trên cửa hàng"
                            aria-label={`Xem ${p.name} trên cửa hàng`}
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                          >
                            <ExternalLink className="size-4" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            title="Sửa"
                            aria-label={`Sửa ${p.name}`}
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(p)}
                            title="Xoá"
                            aria-label={`Xoá ${p.name}`}
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-blush-300 hover:text-blush-600"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thẻ cho mobile/tablet */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {products.map((p) => (
                <li key={p.id} className="space-y-3 p-4">
                  <div className="flex gap-3">
                    <img
                      src={sizedImage(p.image, 160)}
                      alt=""
                      loading="lazy"
                      className="size-20 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium text-slate-800">{p.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p.brand ? `${p.brand} · ` : ''}SKU {p.sku || '—'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-blush-600">{formatPrice(p.price)}</span>
                        {p.discount_percent > 0 && <s className="text-xs text-slate-400">{formatPrice(p.original_price)}</s>}
                        <Badge className={STATUS_STYLE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      Tồn kho: <StockText stock={p.stock} />
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/products/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        <ExternalLink className="size-3.5" aria-hidden /> Xem
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        <Pencil className="size-3.5" aria-hidden /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(p)}
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blush-600"
                      >
                        <Trash2 className="size-3.5" aria-hidden /> Xoá
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {data && (
        <>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
            <Package className="size-3.5" aria-hidden /> {data.total} sản phẩm
          </p>
          <Pagination page={data.page} pages={data.pages} onChange={(page) => updateFilters({ page })} />
        </>
      )}

      <ProductFormModal open={formOpen} product={editing} onClose={() => setFormOpen(false)} onSaved={reload} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xoá sản phẩm này?"
        confirmLabel="Xoá vĩnh viễn"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => !deleteBusy && setDeleting(null)}
      >
        <p>
          Sản phẩm <strong className="text-slate-800">{deleting?.name}</strong> sẽ bị xoá khỏi cửa hàng cùng toàn bộ ảnh và
          đánh giá của khách. Thao tác này không hoàn tác được.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Các đơn hàng đã đặt vẫn giữ nguyên tên và giá sản phẩm tại thời điểm mua. Nếu chỉ muốn tạm ngừng bán, hãy sửa
          trạng thái sang <strong>Ẩn khỏi cửa hàng</strong>.
        </p>
      </ConfirmDialog>
    </>
  )
}
