import { Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthContext'
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, PAYMENT_METHOD_LABEL } from '../components/order/orderLabels'
import Breadcrumb from '../components/ui/Breadcrumb'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'
import { formatPrice, sizedImage } from '../lib/format'

export default function OrdersPage() {
  const { user, loading: authLoading, openAuth } = useAuth()
  const { data, loading } = useFetch(() => (user ? api.myOrders() : Promise.resolve(null)), [user?.id])

  if (authLoading) return null
  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-slate-600">Vui lòng đăng nhập để xem đơn hàng.</p>
        <button type="button" onClick={() => openAuth('login')} className="mt-4 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">
          Đăng nhập
        </button>
      </div>
    )
  }

  const orders = data?.items ?? []
  return (
    <div className="container-page py-6">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Đơn hàng của tôi' }]} />
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate-900 md:text-3xl">Đơn hàng của tôi</h1>

      {loading && !data ? (
        <p className="mt-6 text-sm text-slate-500">Đang tải...</p>
      ) : orders.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 py-16 text-center">
          <Package className="mx-auto size-12 text-slate-300" aria-hidden />
          <p className="mt-3 font-semibold text-slate-700">Bạn chưa có đơn hàng nào</p>
          <Link to="/products" className="mt-4 inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.order_code}>
              <Link
                to={`/orders/${o.order_code}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-brand-200 hover:shadow-card"
              >
                {o.first_item && (
                  <img src={sizedImage(o.first_item.image, 150)} alt="" className="size-14 shrink-0 rounded-xl border border-slate-100 object-contain p-1" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{o.order_code}</p>
                  <p className="line-clamp-1 text-sm text-slate-500">
                    {o.first_item?.name}
                    {o.item_count > 1 && ` và ${o.item_count - 1} sản phẩm khác`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(o.order_date).toLocaleDateString('vi-VN')} · {PAYMENT_METHOD_LABEL[o.payment.method]}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                  <p className="mt-1 font-bold text-blush-600">{formatPrice(o.total_amount)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
