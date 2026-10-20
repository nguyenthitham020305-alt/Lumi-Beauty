import { ArrowLeft, CreditCard, Loader2, MapPin, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import OrderActions from '../../components/admin/OrderActions'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_STEPS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
} from '../../components/order/orderLabels'
import PriceSummary from '../../components/order/PriceSummary'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { formatPrice, sizedImage } from '../../lib/format'

const SHIPMENT_STATUS_LABEL = {
  pending: 'Chờ lấy hàng',
  picked_up: 'Đã lấy hàng',
  in_transit: 'Đang vận chuyển',
  delivered: 'Đã giao',
  failed: 'Giao thất bại',
}

function StatusSteps({ status }) {
  const current = ORDER_STEPS.findIndex((s) => s.status === status)
  return (
    <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Tiến trình đơn hàng">
      {ORDER_STEPS.map((step, i) => (
        <li key={step.status} className="text-center">
          <span className={`mx-auto block h-1.5 rounded-full ${i <= current ? 'bg-brand-500' : 'bg-slate-200'}`} />
          <span className={`mt-2 block text-xs ${i <= current ? 'font-semibold text-brand-700' : 'text-slate-400'}`}>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        {Icon && <Icon className="size-4 text-brand-600" aria-hidden />} {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default function AdminOrderDetailPage() {
  const { code } = useParams()
  const { data, loading, error } = useFetch(() => api.adminOrder(code), [code])
  const [order, setOrder] = useState(null)

  useEffect(() => setOrder(data?.order ?? null), [data])

  const backLink = (
    <Link to="/admin/don-hang" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700">
      <ArrowLeft className="size-4" aria-hidden /> Danh sách đơn hàng
    </Link>
  )

  if (loading && !order) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải đơn hàng...
      </p>
    )
  }
  if (error || !order) {
    return (
      <>
        {backLink}
        <p className="mt-4 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error?.message ?? 'Không tìm thấy đơn hàng'}</p>
      </>
    )
  }

  const { payment } = order
  return (
    <>
      {backLink}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">Đơn hàng {order.order_code}</h1>
          <p className="mt-1 text-sm text-slate-500">Đặt lúc {new Date(order.order_date).toLocaleString('vi-VN')}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Cập nhật trạng thái</h2>
            {order.status === 'cancelled' ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Đơn đã huỷ{order.cancelled_reason ? ` — Lý do: ${order.cancelled_reason}` : ''}
              </p>
            ) : (
              <StatusSteps status={order.status} />
            )}
            {payment.method === 'bank_transfer' && payment.status !== 'paid' && order.status === 'pending' && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Đơn chuyển khoản QR: kiểm tra tài khoản ngân hàng với nội dung "LUMI {order.order_code}", bấm "Đã nhận tiền" rồi mới xác nhận đơn.
              </p>
            )}
            {payment.method === 'cod' && order.status !== 'cancelled' && payment.status !== 'paid' && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Đơn COD sẽ tự chuyển sang "Đã thanh toán" khi đánh dấu giao thành công.
              </p>
            )}
            <div className="mt-4">
              <OrderActions order={order} onUpdated={setOrder} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" aria-labelledby="items-heading">
            <h2 id="items-heading" className="font-semibold text-slate-900">
              Sản phẩm ({order.item_count})
            </h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={`${item.product_id}-${item.name}`} className="flex gap-3 py-3">
                  <img src={sizedImage(item.image, 150)} alt="" className="size-16 shrink-0 rounded-xl border border-slate-100 object-contain p-1" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-slate-700">{item.name}</p>
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
          <Card title="Khách hàng" icon={User}>
            <p className="text-sm font-semibold text-slate-800">{order.customer.name}</p>
            <p className="text-sm break-all text-slate-600">{order.customer.email}</p>
          </Card>

          <Card title="Thông tin nhận hàng" icon={MapPin}>
            <p className="text-sm font-semibold text-slate-800">{order.recipient.name}</p>
            <p className="text-sm text-slate-600">{order.recipient.phone}</p>
            <p className="text-sm break-all text-slate-600">{order.recipient.email}</p>
            <p className="mt-1 text-sm text-slate-600">{order.recipient.address}</p>
            {order.shipment_status && (
              <p className="mt-2 text-xs text-slate-500">Vận chuyển: {SHIPMENT_STATUS_LABEL[order.shipment_status]}</p>
            )}
            {order.note && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">Ghi chú: {order.note}</p>}
          </Card>

          <Card title="Thanh toán" icon={CreditCard}>
            <p className="text-sm text-slate-600">{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLE[payment.status]}`}>
              {PAYMENT_STATUS_LABEL[payment.status]}
            </span>
            {payment.paid_at && <p className="mt-1 text-xs text-slate-500">Thanh toán lúc {new Date(payment.paid_at).toLocaleString('vi-VN')}</p>}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <PriceSummary subtotal={order.subtotal} discount={order.discount_amount} shippingFee={order.shipping_fee} total={order.total_amount} />
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}
