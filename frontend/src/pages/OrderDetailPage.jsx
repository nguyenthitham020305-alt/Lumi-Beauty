import { CheckCircle2, Copy, MapPin, QrCode } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthContext'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_STEPS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from '../components/order/orderLabels'
import PriceSummary from '../components/order/PriceSummary'
import Breadcrumb from '../components/ui/Breadcrumb'
import { useToast } from '../components/ui/Toast'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'
import { formatPrice, sizedImage } from '../lib/format'

function StatusSteps({ status }) {
  const current = ORDER_STEPS.findIndex((s) => s.status === status)
  return (
    <ol className="mt-5 grid grid-cols-2 gap-2" aria-label="Tiến trình đơn hàng">
      {ORDER_STEPS.map((step, i) => (
        <li key={step.status} className="text-center">
          <span className={`mx-auto block h-1.5 rounded-full ${i <= current ? 'bg-brand-500' : 'bg-slate-200'}`} />
          <span className={`mt-2 block text-xs ${i <= current ? 'font-semibold text-brand-700' : 'text-slate-400'}`}>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

function CopyValue({ label, value, display }) {
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      toast(`Đã sao chép ${label.toLowerCase()}`)
    } catch {
      toast('Không sao chép được, vui lòng chép tay', 'error')
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="flex items-center gap-1.5 text-right font-semibold text-slate-800">
        {display ?? value}
        <button type="button" onClick={copy} aria-label={`Sao chép ${label}`} className="rounded p-1 text-slate-400 hover:text-brand-600">
          <Copy className="size-3.5" aria-hidden />
        </button>
      </dd>
    </div>
  )
}

export default function OrderDetailPage() {
  const { code } = useParams()
  const { state } = useLocation()
  const { user, loading: authLoading, openAuth } = useAuth()
  const { data, loading, error } = useFetch(() => (user ? api.order(code) : Promise.resolve(null)), [code, user?.id])

  if (authLoading || (loading && !data)) return <p className="container-page py-20 text-center text-slate-500">Đang tải đơn hàng...</p>
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
  if (error || !data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Không tìm thấy đơn hàng</h1>
        <Link to="/orders" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
          Xem đơn hàng của tôi
        </Link>
      </div>
    )
  }

  const order = data.order
  return (
    <div className="container-page py-6">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Đơn hàng của tôi', to: '/orders' }, { label: order.order_code }]} />

      {state?.justPlaced && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800" role="status">
          <CheckCircle2 className="size-6 shrink-0" aria-hidden />
          <p>
            <b>Đặt hàng thành công!</b> Cảm ơn bạn đã mua sắm tại LUMI Beauty. Chúng tôi sẽ liên hệ xác nhận đơn sớm nhất.
          </p>
        </div>
      )}

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-3xl border border-slate-100 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold text-slate-900">Đơn hàng {order.order_code}</h1>
                <p className="mt-1 text-sm text-slate-500">Đặt lúc {new Date(order.order_date).toLocaleString('vi-VN')}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS_STYLE[order.status]}`}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
            <StatusSteps status={order.status} />
          </section>

          <section className="rounded-3xl border border-slate-100 p-5 md:p-6" aria-labelledby="items-heading">
            <h2 id="items-heading" className="text-lg font-semibold text-slate-900">
              Sản phẩm ({order.item_count})
            </h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={`${item.product_id}-${item.name}`} className="flex gap-3 py-3">
                  <img src={sizedImage(item.image, 150)} alt="" className="size-16 shrink-0 rounded-xl border border-slate-100 object-contain p-1" />
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link to={`/products/${item.slug}`} className="line-clamp-2 text-sm text-slate-700 hover:text-brand-700">
                        {item.name}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm text-slate-700">{item.name}</p>
                    )}
                    {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPrice(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{formatPrice(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-3xl border border-slate-100 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <MapPin className="size-4 text-brand-600" aria-hidden /> Thông tin nhận hàng
            </h2>
            <p className="mt-3 text-sm font-semibold text-slate-800">{order.recipient.name}</p>
            <p className="text-sm text-slate-600">
              {order.recipient.phone} · {order.recipient.email}
            </p>
            <p className="mt-1 text-sm text-slate-600">{order.recipient.address}</p>
            {order.note && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">Ghi chú: {order.note}</p>}
          </section>

          <section className="rounded-3xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">Thanh toán</h2>
            <p className="mt-2 text-sm text-slate-600">{PAYMENT_METHOD_LABEL[order.payment.method]}</p>
            <p className={`mt-1 text-sm font-semibold ${order.payment.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {PAYMENT_STATUS_LABEL[order.payment.status]}
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <PriceSummary subtotal={order.subtotal} discount={order.discount_amount} shippingFee={order.shipping_fee} total={order.total_amount} />
            </div>
          </section>

          <Link to="/products" className="block rounded-full bg-brand-600 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700">
            Tiếp tục mua sắm
          </Link>
        </aside>
      </div>
    </div>
  )
}
