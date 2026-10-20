import { formatPrice } from '../../lib/format'

/** Dùng chung cho trang Thanh toán và Chi tiết đơn: tạm tính, giảm giá, phí ship, tổng. */
export default function PriceSummary({ subtotal, discount, shippingFee, total, freeShippingThreshold }) {
  const missingForFreeShip = freeShippingThreshold && shippingFee > 0 ? freeShippingThreshold - subtotal : 0

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <dt>Tạm tính</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-slate-600">
        <dt>Giảm giá</dt>
        <dd>{discount > 0 ? `-${formatPrice(discount)}` : formatPrice(0)}</dd>
      </div>
      <div className="flex justify-between text-slate-600">
        <dt>Phí vận chuyển</dt>
        <dd>{shippingFee > 0 ? formatPrice(shippingFee) : <span className="font-medium text-brand-600">Miễn phí</span>}</dd>
      </div>
      {missingForFreeShip > 0 && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Mua thêm {formatPrice(missingForFreeShip)} để được miễn phí vận chuyển
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
        <dt className="font-semibold text-slate-800">
          Tổng cộng <span className="text-xs font-normal text-slate-400">(đã gồm VAT)</span>
        </dt>
        <dd className="text-xl font-bold text-blush-600">{formatPrice(total)}</dd>
      </div>
    </dl>
  )
}
