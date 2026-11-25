import { PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

/**
 * Đơn hàng chỉ còn một thao tác: Đã đặt hàng -> Hoàn tất.
 *
 * Nút hiện ra dựa trên order.next_statuses do backend tính, nên quy tắc
 * chuyển trạng thái chỉ nằm ở một chỗ duy nhất (server).
 * compact: dùng trong bảng danh sách, chữ nhỏ hơn.
 */
export default function OrderActions({ order, onUpdated, compact = false }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)

  const canComplete = order.next_statuses.includes('completed')
  if (!canComplete) {
    return compact ? (
      <span className="text-xs text-slate-400">—</span>
    ) : (
      <p className="text-sm text-slate-500">Đơn hàng đã hoàn tất, không còn thao tác.</p>
    )
  }

  const complete = async () => {
    setBusy(true)
    try {
      const { order: updated } = await api.updateOrderStatus(order.order_code, 'completed')
      toast('Đơn hàng đã hoàn tất')
      setAsking(false)
      onUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => setAsking(true)}
        className={`flex items-center gap-1.5 rounded-full bg-brand-600 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
        }`}
      >
        <PackageCheck className="size-4" aria-hidden /> Hoàn tất đơn hàng
      </button>

      <ConfirmDialog
        open={asking}
        busy={busy}
        title={`Hoàn tất đơn ${order.order_code}?`}
        confirmLabel="Hoàn tất đơn hàng"
        onClose={() => setAsking(false)}
        onConfirm={complete}
      >
        <p>
          Xác nhận đã giao hàng tới khách và thu đủ <b>{formatPrice(order.total_amount)}</b>. Khoản thanh
          toán sẽ được đánh dấu là đã trả.
        </p>
        <p className="mt-2 text-slate-500">Thao tác này không thể hoàn tác.</p>
      </ConfirmDialog>
    </>
  )
}
