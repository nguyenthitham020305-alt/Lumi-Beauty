import { Clock, Loader2, Package, Receipt, TrendingUp, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import RevenueChart from '../../components/admin/charts/RevenueChart'
import StatusChart from '../../components/admin/charts/StatusChart'
import TopProductsChart from '../../components/admin/charts/TopProductsChart'
import RangeFilter from '../../components/admin/RangeFilter'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_METHOD_SHORT,
} from '../../components/order/orderLabels'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { money, num } from '../../lib/chartTheme'

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'

function StatTile({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    blush: 'bg-blush-50 text-blush-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <span className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [params, setParams] = useSearchParams()
  // Mặc định 30 ngày: khoảng 7 ngày thường rỗng khi cửa hàng ít đơn,
  // mở dashboard ra thấy trắng trơn sẽ tưởng là lỗi.
  const range = params.get('range') ?? '30d'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  const { data, loading, error } = useFetch(
    () => api.adminStats({ range, from, to }),
    [range, from, to],
  )

  const changeRange = (key, f, t) => {
    const next = new URLSearchParams()
    if (key !== '30d') next.set('range', key)
    if (key === 'custom') {
      if (f) next.set('from', f)
      if (t) next.set('to', t)
    }
    setParams(next, { replace: true })
  }

  const header = (
    <>
      <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">Tổng quan</h1>
      <p className="mt-1 text-sm text-slate-500">
        Báo cáo tổng hợp trực tiếp từ cơ sở dữ liệu, cập nhật theo thời gian thực.
      </p>
      <div className="mt-5">
        <RangeFilter value={range} from={data?.range.from ?? from} to={data?.range.to ?? to} onChange={changeRange} />
      </div>
    </>
  )

  if (error) {
    return (
      <>
        {header}
        <p className="mt-6 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error.message}</p>
      </>
    )
  }
  if (!data) {
    return (
      <>
        {header}
        <p className="mt-8 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tổng hợp số liệu...
        </p>
      </>
    )
  }

  const t = data.totals
  const label = data.range.label
  const noOrders = t.orders === 0

  return (
    <>
      {header}

      <div className={`mt-6 ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
        {/* Hàng số liệu chính — thứ tự theo mức độ quan trọng với người quản lý */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          <StatTile
            icon={TrendingUp}
            label="Tổng doanh thu"
            value={money(t.revenue)}
            hint={t.orders ? `TB ${money(t.avg_order_value)}/đơn` : 'Chưa có đơn'}
          />
          <StatTile icon={Receipt} label="Tổng đơn hàng" value={num(t.orders)} hint={`${num(t.cancelled_orders)} đơn huỷ`} />
          <StatTile
            icon={Clock}
            label="Đơn chờ xử lý"
            value={num(t.pending_orders)}
            hint={t.pending_orders > 0 ? 'Cần xác nhận' : 'Đã xử lý hết'}
            tone={t.pending_orders > 0 ? 'amber' : 'brand'}
          />
          <StatTile icon={Users} label="Tổng khách hàng" value={num(t.customers)} hint="Toàn hệ thống" />
          <StatTile icon={Package} label="Tổng sản phẩm" value={num(t.products)} hint="Toàn hệ thống" />
        </div>

        {noOrders && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Không có đơn hàng nào trong <strong>{label}</strong>. Thử chọn khoảng thời gian rộng hơn.
          </p>
        )}

        {/* Hai biểu đồ quan trọng nhất đứng trước */}
        <div className="mt-5 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RevenueChart series={data.revenue_series} bucket={data.range.bucket} rangeLabel={label} />
          </div>
          <div className="lg:col-span-2">
            <StatusChart breakdown={data.status_breakdown} rangeLabel={label} />
          </div>
        </div>

        <div className="mt-4">
          <TopProductsChart products={data.top_products} rangeLabel={label} />
        </div>

        <section className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm" aria-labelledby="recent-orders">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 id="recent-orders" className="font-semibold text-slate-900">
              Đơn hàng gần đây
            </h2>
            <Link to="/admin/don-hang" className="text-xs font-medium text-brand-700 hover:underline">
              Xem tất cả
            </Link>
          </div>

          {data.recent_orders.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Chưa có đơn hàng trong khoảng thời gian này</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Mã đơn</th>
                    <th className="px-5 py-3 font-medium">Khách hàng</th>
                    <th className="px-5 py-3 font-medium">Thời gian</th>
                    <th className="px-5 py-3 text-right font-medium">Tổng tiền</th>
                    <th className="px-5 py-3 font-medium">Thanh toán</th>
                    <th className="px-5 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_orders.map((o) => (
                    <tr key={o.order_code} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <Link to={`/admin/don-hang/${o.order_code}`} className="font-semibold text-brand-700 hover:underline">
                          {o.order_code}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-3 text-slate-700">{o.customer_name}</td>
                      <td className="px-5 py-3 text-slate-600">{formatDateTime(o.order_date)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(o.total_amount)}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{PAYMENT_METHOD_SHORT[o.payment_method] ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLE[o.status]}`}>
                          {ORDER_STATUS_LABEL[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
