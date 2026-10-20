import { Eye, Loader2, Package, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import OrderActions from '../../components/admin/OrderActions'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_METHOD_SHORT,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
} from '../../components/order/orderLabels'
import Pagination from '../../components/ui/Pagination'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'

const STATUS_TABS = ['', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled']
const SEARCH_DEBOUNCE_MS = 400

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

function Badge({ className, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>{children}</span>
}

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    payment_method: params.get('payment_method') ?? '',
    sort: params.get('sort') ?? 'newest',
    page: Number(params.get('page')) || 1,
  }
  const [searchText, setSearchText] = useState(filters.q)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useFetch(() => api.adminOrders(filters), [params.toString(), reloadKey])

  const updateFilters = (patch) => {
    const next = { ...filters, page: 1, ...patch }
    const search = new URLSearchParams()
    if (next.q) search.set('q', next.q)
    if (next.status) search.set('status', next.status)
    if (next.payment_method) search.set('payment_method', next.payment_method)
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

  // Tải lại để đơn vừa đổi trạng thái rời khỏi tab/bộ lọc không còn khớp
  const reload = () => setReloadKey((k) => k + 1)

  const counts = data?.status_counts ?? {}
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const orders = data?.items ?? []

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">Quản lý đơn hàng</h1>
      <p className="mt-1 text-sm text-slate-500">Theo dõi, xác nhận và cập nhật trạng thái đơn hàng của khách.</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Lọc theo trạng thái đơn">
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
                active ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {s ? ORDER_STATUS_LABEL[s] : 'Tất cả'}
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
            <span className="sr-only">Tìm theo mã đơn hoặc email khách hàng</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc email khách hàng..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <select
              aria-label="Phương thức thanh toán"
              value={filters.payment_method}
              onChange={(e) => updateFilters({ payment_method: e.target.value })}
              className={selectClass}
            >
              <option value="">Mọi phương thức</option>
              <option value="cod">COD</option>
              <option value="bank_transfer">Chuyển khoản QR</option>
            </select>
            <select aria-label="Sắp xếp theo ngày đặt" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })} className={selectClass}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>

        {error ? (
          <p className="m-4 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error.message}</p>
        ) : !data ? (
          <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải đơn hàng...
          </p>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto size-12 text-slate-300" aria-hidden />
            <p className="mt-3 font-semibold text-slate-700">Không có đơn hàng phù hợp</p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
            {/* Bảng cho màn hình vừa trở lên */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mã đơn</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Ngày đặt</th>
                    <th className="px-4 py-3 text-right font-medium">Tổng tiền</th>
                    <th className="px-4 py-3 font-medium">Thanh toán</th>
                    <th className="px-4 py-3 font-medium">TT thanh toán</th>
                    <th className="px-4 py-3 font-medium">TT đơn hàng</th>
                    <th className="px-4 py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.order_code} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link to={`/admin/don-hang/${o.order_code}`} className="font-semibold text-brand-700 hover:underline">
                          {o.order_code}
                        </Link>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate font-medium text-slate-800">{o.customer.name}</p>
                        <p className="truncate text-xs text-slate-500">{o.customer.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(o.order_date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatPrice(o.total_amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{PAYMENT_METHOD_SHORT[o.payment.method] ?? o.payment.method}</td>
                      <td className="px-4 py-3">
                        <Badge className={PAYMENT_STATUS_STYLE[o.payment.status]}>{PAYMENT_STATUS_LABEL[o.payment.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ORDER_STATUS_STYLE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/don-hang/${o.order_code}`}
                            aria-label={`Xem chi tiết đơn ${o.order_code}`}
                            title="Xem chi tiết"
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                          >
                            <Eye className="size-4" aria-hidden />
                          </Link>
                          <OrderActions order={o} onUpdated={reload} compact />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thẻ cho mobile/tablet */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {orders.map((o) => (
                <li key={o.order_code} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/admin/don-hang/${o.order_code}`} className="font-semibold text-brand-700 hover:underline">
                        {o.order_code}
                      </Link>
                      <p className="truncate text-sm text-slate-700">{o.customer.name}</p>
                      <p className="truncate text-xs text-slate-500">{o.customer.email}</p>
                    </div>
                    <Badge className={ORDER_STATUS_STYLE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{formatDate(o.order_date)}</span>
                    <span>{PAYMENT_METHOD_SHORT[o.payment.method] ?? o.payment.method}</span>
                    <Badge className={PAYMENT_STATUS_STYLE[o.payment.status]}>{PAYMENT_STATUS_LABEL[o.payment.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-blush-600">{formatPrice(o.total_amount)}</span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/don-hang/${o.order_code}`}
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        <Eye className="size-4" aria-hidden /> Chi tiết
                      </Link>
                      <OrderActions order={o} onUpdated={reload} compact />
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
          <p className="mt-4 text-center text-xs text-slate-500">{data.total} đơn hàng</p>
          <Pagination page={data.page} pages={data.pages} onChange={(page) => updateFilters({ page })} />
        </>
      )}
    </>
  )
}
