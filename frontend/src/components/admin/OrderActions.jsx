import { Ban, CheckCircle2, CircleDollarSign, PackageCheck, Undo2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

const STATUS_ACTION = {
  confirmed: { label: 'Xác nhận đơn', icon: CheckCircle2, done: 'Đã xác nhận đơn' },
  delivered: { label: 'Đã giao thành công', icon: PackageCheck, done: 'Đơn đã giao thành công' },
}

const PAYMENT_ACTION = {
  paid: { label: 'Đã nhận tiền', icon: CircleDollarSign, done: 'Đã xác nhận thanh toán' },
  failed: { label: 'Thanh toán lỗi', icon: XCircle, done: 'Đã đánh dấu thanh toán lỗi' },
  refunded: { label: 'Đã hoàn tiền', icon: Undo2, done: 'Đã đánh dấu hoàn tiền' },
}

const REASON_MAX = 255

/**
 * Nút thao tác dựa trên next_statuses / next_payment_statuses do backend tính,
 * nên quy tắc chuyển trạng thái chỉ nằm ở một chỗ (server).
 * compact: chỉ hiện bước tiếp theo chính + nút huỷ, dùng trong bảng.
 */
export default function OrderActions({ order, onUpdated, compact = false }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState(null) // 'cancel' | 'refunded'
  const [reason, setReason] = useState('')

  const run = async (call, doneMessage) => {
    setBusy(true)
    try {
      const { order: updated } = await call()
      toast(doneMessage)
      setDialog(null)
      onUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = (status, reasonText) =>
    run(() => api.updateOrderStatus(order.order_code, status, reasonText), STATUS_ACTION[status]?.done ?? 'Đã huỷ đơn hàng')
  const changePayment = (status) => run(() => api.updatePaymentStatus(order.order_code, status), PAYMENT_ACTION[status].done)

  const forwardStatuses = order.next_statuses.filter((s) => s !== 'cancelled')
  const canCancel = order.next_statuses.includes('cancelled')
  let paymentStatuses = order.next_payment_statuses
  let statuses = forwardStatuses
  if (compact) {
    statuses = forwardStatuses.slice(0, 1)
    paymentStatuses = statuses.length ? [] : paymentStatuses.filter((s) => s === 'paid')
  }

  const btn = compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
  const nothingToDo = !statuses.length && !paymentStatuses.length && !canCancel

  if (nothingToDo) return compact ? <span className="text-xs text-slate-400">—</span> : <p className="text-sm text-slate-500">Đơn hàng đã kết thúc, không còn thao tác.</p>

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((s) => {
        const { label, icon: Icon } = STATUS_ACTION[s]
        return (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => changeStatus(s)}
            className={`flex items-center gap-1.5 rounded-full bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 ${btn}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        )
      })}
      {paymentStatuses.map((s) => {
        const { label, icon: Icon } = PAYMENT_ACTION[s]
        const tone = s === 'paid' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        return (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => (s === 'refunded' ? setDialog('refunded') : changePayment(s))}
            className={`flex items-center gap-1.5 rounded-full border font-semibold disabled:opacity-60 ${tone} ${btn}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        )
      })}
      {canCancel && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setReason('')
            setDialog('cancel')
          }}
          aria-label={compact ? `Huỷ đơn ${order.order_code}` : undefined}
          className={`flex items-center gap-1.5 rounded-full border border-blush-200 font-semibold text-blush-600 hover:bg-blush-50 disabled:opacity-60 ${btn}`}
        >
          <Ban className="size-4" aria-hidden /> {compact ? 'Huỷ' : 'Huỷ đơn'}
        </button>
      )}

      <ConfirmDialog
        open={dialog === 'cancel'}
        danger
        busy={busy}
        title={`Huỷ đơn ${order.order_code}?`}
        confirmLabel="Huỷ đơn hàng"
        onClose={() => setDialog(null)}
        onConfirm={() => changeStatus('cancelled', reason)}
      >
        <p>Sản phẩm sẽ được hoàn lại tồn kho. Thao tác này không thể hoàn tác.</p>
        {order.payment.status === 'paid' && (
          <p className="mt-2 font-medium text-amber-700">
            Khách đã thanh toán {formatPrice(order.total_amount)}. Nhớ hoàn tiền và đánh dấu "Đã hoàn tiền" sau khi huỷ.
          </p>
        )}
        <label htmlFor={`cancel-reason-${order.order_code}`} className="mt-4 block font-medium text-slate-700">
          Lý do huỷ <span className="font-normal text-slate-400">(không bắt buộc)</span>
        </label>
        <textarea
          id={`cancel-reason-${order.order_code}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={REASON_MAX}
          rows={3}
          placeholder="Vd: Khách yêu cầu huỷ, hết hàng..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'refunded'}
        busy={busy}
        title="Xác nhận đã hoàn tiền?"
        confirmLabel="Đã hoàn tiền"
        onClose={() => setDialog(null)}
        onConfirm={() => changePayment('refunded')}
      >
        Chỉ đánh dấu sau khi đã chuyển trả {formatPrice(order.total_amount)} cho khách.
      </ConfirmDialog>
    </div>
  )
}
