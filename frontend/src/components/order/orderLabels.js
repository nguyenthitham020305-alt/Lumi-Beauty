export const ORDER_STEPS = [
  { status: 'pending', label: 'Chờ xác nhận' },
  { status: 'confirmed', label: 'Đã xác nhận' },
  { status: 'shipping', label: 'Đang giao' },
  { status: 'delivered', label: 'Đã giao' },
]

export const ORDER_STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã huỷ',
}

export const ORDER_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-brand-50 text-brand-700',
  shipping: 'bg-sky-50 text-sky-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản qua mã QR',
}

export const PAYMENT_METHOD_SHORT = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản QR',
}

export const PAYMENT_STATUS_LABEL = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
}

export const PAYMENT_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-blush-50 text-blush-600',
  refunded: 'bg-slate-100 text-slate-500',
}
