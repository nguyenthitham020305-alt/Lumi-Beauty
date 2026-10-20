import { Eye, Lock, LockOpen, Loader2, Search, Users, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'

const SEARCH_DEBOUNCE_MS = 400
const STATUS_TABS = ['', 'active', 'locked']
const STATUS_TAB_LABEL = { '': 'Tất cả', active: 'Đang hoạt động', locked: 'Đã khoá' }

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-blush-50 text-blush-600'
      }`}
    >
      {active ? <LockOpen className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
      {active ? 'Hoạt động' : 'Đã khoá'}
    </span>
  )
}

export default function AdminCustomersPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    sort: params.get('sort') ?? 'newest',
    page: Number(params.get('page')) || 1,
  }
  const [searchText, setSearchText] = useState(filters.q)
  const [reloadKey, setReloadKey] = useState(0)
  const [target, setTarget] = useState(null) // khách đang chờ xác nhận khoá/mở
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useFetch(() => api.adminCustomers(filters), [params.toString(), reloadKey])

  const updateFilters = (patch) => {
    const next = { ...filters, page: 1, ...patch }
    const search = new URLSearchParams()
    if (next.q) search.set('q', next.q)
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

  const confirmToggle = async () => {
    setBusy(true)
    try {
      const res = await api.setCustomerActive(target.id, !target.is_active)
      toast(res.customer.is_active ? `Đã mở khoá "${res.customer.name}"` : `Đã khoá "${res.customer.name}"`)
      setTarget(null)
      setReloadKey((k) => k + 1)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const counts = data?.status_counts ?? {}
  const allCount = (counts.active ?? 0) + (counts.locked ?? 0)
  const customers = data?.items ?? []
  const locking = target?.is_active // đang mở -> hành động sắp tới là khoá

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">Quản lý khách hàng</h1>
      <p className="mt-1 text-sm text-slate-500">Xem thông tin, lịch sử mua hàng và khoá tài khoản khi cần.</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Lọc theo trạng thái tài khoản">
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
              {STATUS_TAB_LABEL[s]}
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
            <span className="sr-only">Tìm theo tên, email hoặc số điện thoại</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <select aria-label="Sắp xếp" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })} className={selectClass}>
            <option value="newest">Đăng ký mới nhất</option>
            <option value="oldest">Đăng ký cũ nhất</option>
            <option value="name">Tên A → Z</option>
            <option value="orders">Nhiều đơn nhất</option>
            <option value="spent">Chi tiêu nhiều nhất</option>
          </select>
        </div>

        {error ? (
          <p className="m-4 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error.message}</p>
        ) : !data ? (
          <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải khách hàng...
          </p>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center">
            <UserX className="mx-auto size-12 text-slate-300" aria-hidden />
            <p className="mt-3 font-semibold text-slate-700">Không có khách hàng phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Thử đổi từ khoá hoặc bỏ bớt bộ lọc.</p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
            {/* Bảng cho màn hình lớn */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 font-medium">Họ tên</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Số điện thoại</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Ngày đăng ký</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Đơn / Chi tiêu</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.id}</td>
                      <td className="max-w-[200px] px-4 py-3">
                        <Link to={`/admin/khach-hang/${c.id}`} className="truncate font-medium text-brand-700 hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate text-slate-600" title={c.email}>
                          {c.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{c.phone || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{c.order_count} đơn</p>
                        <p className="text-xs text-blush-600">{formatPrice(c.total_spent)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge active={c.is_active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/admin/khach-hang/${c.id}`}
                            title="Xem chi tiết"
                            aria-label={`Xem chi tiết khách hàng ${c.name}`}
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                          >
                            <Eye className="size-4" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTarget(c)}
                            title={c.is_active ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                            aria-label={`${c.is_active ? 'Khoá' : 'Mở khoá'} tài khoản ${c.name}`}
                            className={`rounded-full border border-slate-200 p-1.5 ${
                              c.is_active
                                ? 'text-slate-500 hover:border-blush-300 hover:text-blush-600'
                                : 'text-emerald-600 hover:border-emerald-300'
                            }`}
                          >
                            {c.is_active ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
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
              {customers.map((c) => (
                <li key={c.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/admin/khach-hang/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{c.email}</p>
                      <p className="text-xs text-slate-500">
                        {c.phone || 'Chưa có SĐT'} · Đăng ký {formatDate(c.created_at)}
                      </p>
                    </div>
                    <StatusBadge active={c.is_active} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">
                      <strong className="text-slate-800">{c.order_count} đơn</strong> ·{' '}
                      <span className="font-semibold text-blush-600">{formatPrice(c.total_spent)}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/khach-hang/${c.id}`}
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        <Eye className="size-3.5" aria-hidden /> Chi tiết
                      </Link>
                      <button
                        type="button"
                        onClick={() => setTarget(c)}
                        className={`flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold ${
                          c.is_active ? 'text-blush-600' : 'text-emerald-600'
                        }`}
                      >
                        {c.is_active ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                        {c.is_active ? 'Khoá' : 'Mở khoá'}
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
            <Users className="size-3.5" aria-hidden /> {data.total} khách hàng
          </p>
          <Pagination page={data.page} pages={data.pages} onChange={(page) => updateFilters({ page })} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title={locking ? 'Khoá tài khoản này?' : 'Mở khoá tài khoản này?'}
        confirmLabel={locking ? 'Khoá tài khoản' : 'Mở khoá'}
        danger={locking}
        busy={busy}
        onConfirm={confirmToggle}
        onClose={() => !busy && setTarget(null)}
      >
        <p>
          Tài khoản <strong className="text-slate-800">{target?.name}</strong> ({target?.email})
          {locking ? ' sẽ không đăng nhập được nữa.' : ' sẽ đăng nhập lại được bình thường.'}
        </p>
        {locking && (
          <p className="mt-2 text-xs text-slate-500">
            Đơn hàng đã đặt vẫn được giữ nguyên và xử lý bình thường. Bạn có thể mở khoá lại bất cứ lúc nào.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
