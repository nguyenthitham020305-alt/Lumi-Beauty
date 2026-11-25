export const ORDER_STEPS = [
  { status: 'pending', label: 'Đã đặt hàng' },
  { status: 'completed', label: 'Hoàn tất' },
]

export const ORDER_STATUS_LABEL = {
  pending: 'Đã đặt hàng',
  completed: 'Hoàn tất',
}

export const ORDER_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

export const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận hàng (COD)',
}

export const PAYMENT_METHOD_SHORT = {
  cod: 'COD',
}

export const PAYMENT_STATUS_LABEL = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
}

export const PAYMENT_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
}
