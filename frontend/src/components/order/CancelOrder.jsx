import { Ban, Phone } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

const PRESET_REASONS = [
  'Tôi muốn thay đổi sản phẩm hoặc số lượng',
  'Tôi muốn sửa địa chỉ hoặc số điện thoại nhận hàng',
  'Tôi đặt nhầm đơn này',
  'Tôi tìm được nơi bán với giá tốt hơn',
  'Tôi không còn nhu cầu mua nữa',
]
const OTHER = '__other__'
const OTHER_MAX = 200

function ContactHint({ children }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
      <Phone className="size-4 shrink-0 translate-y-0.5 text-slate-400" aria-hidden />
      <span>
        {children}{' '}
        <a href="tel:19001234" className="font-semibold text-brand-600 hover:underline">
          1900 1234
        </a>
        .
      </span>
    </p>
  )
}

/**
 * Khách chỉ tự huỷ được khi đơn còn chờ xác nhận; quyền này do server quyết định
 * qua order.can_cancel nên frontend không tự suy ra từ trạng thái.
 */
export default function CancelOrder({ order, onUpdated }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [choice, setChoice] = useState(PRESET_REASONS[0])
  const [otherText, setOtherText] = useState('')

  // Đơn đã giao hoặc đã huỷ thì không còn gì để nói thêm
  if (order.status === 'delivered' || order.status === 'cancelled') return null

  if (!order.can_cancel) {
    return order.status === 'pending' ? (
      <ContactHint>Đơn hàng đã ghi nhận thanh toán nên không thể tự huỷ. Để được hỗ trợ huỷ đơn và hoàn tiền, vui lòng gọi</ContactHint>
    ) : (
      <ContactHint>Đơn hàng đã được xác nhận nên không thể tự huỷ. Nếu bạn vẫn muốn huỷ, vui lòng liên hệ LUMI Beauty qua hotline</ContactHint>
    )
  }

  const submit = async () => {
    setBusy(true)
    try {
      const reason = choice === OTHER ? otherText.trim() : choice
      const { order: updated } = await api.cancelMyOrder(order.order_code, reason)
      setOpen(false)
      toast('Đã huỷ đơn hàng')
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
        onClick={() => setOpen(true)}
        className="mt-5 flex items-center gap-1.5 rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:bg-blush-50"
      >
        <Ban className="size-4" aria-hidden /> Huỷ đơn hàng
      </button>

      <ConfirmDialog
        open={open}
        danger
        busy={busy}
        title={`Huỷ đơn ${order.order_code}?`}
        confirmLabel="Huỷ đơn hàng"
        onClose={() => setOpen(false)}
        onConfirm={submit}
      >
        <p>Đơn hàng sẽ được huỷ ngay và không thể khôi phục. Bạn vẫn có thể đặt lại đơn mới bất cứ lúc nào.</p>

        <fieldset className="mt-4">
          <legend className="font-medium text-slate-700">Vui lòng cho biết lý do huỷ</legend>
          <div className="mt-2 space-y-1">
            {[...PRESET_REASONS, OTHER].map((value) => (
              <label key={value} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50">
                <input
                  type="radio"
                  name="cancel-reason"
                  value={value}
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                  className="mt-0.5 size-4 shrink-0 accent-blush-600"
                />
                <span className="text-slate-700">{value === OTHER ? 'Lý do khác' : value}</span>
              </label>
            ))}
          </div>

          {choice === OTHER && (
            <>
              <label htmlFor="cancel-reason-other" className="sr-only">
                Lý do huỷ khác
              </label>
              <textarea
                id="cancel-reason-other"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                maxLength={OTHER_MAX}
                rows={3}
                placeholder="Nhập lý do của bạn (không bắt buộc)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </>
          )}
        </fieldset>
      </ConfirmDialog>
    </>
  )
}
