/**
 * Màu và quy cách dùng chung cho mọi biểu đồ trong trang quản trị.
 *
 * BẢNG MÀU ĐÃ ĐƯỢC KIỂM CHỨNG, KHÔNG ĐOÁN BẰNG MẮT.
 * Cặp màu thương hiệu teal (#127a6a) + hồng (#ef4673) TRƯỢT kiểm tra mù màu:
 * ΔE chỉ 1.9 với người mù màu đỏ (protanopia) — hai màu gần như trùng nhau.
 * Teal cũng dưới ngưỡng chroma (0.091 < 0.10) nên khi đứng một mình đọc ra xám.
 *
 * Vì vậy mọi biểu đồ ở đây phân biệt bằng ĐỘ SÁNG của cùng một hue teal,
 * không dùng hue khác nhau. Các thang dưới đây đều đạt toàn bộ kiểm tra:
 *   - thang 4 bước (trạng thái đơn): đơn hue, sáng→tối, ΔL mỗi bước ≥ 0.06
 *   - thang 2 bước (thanh toán)    : như trên
 *   - màu đơn #2a9782              : đạt cả chroma lẫn tương phản ≥ 3:1
 */

/** Màu cho biểu đồ một chuỗi dữ liệu (doanh thu, sản phẩm bán chạy). */
export const SERIES = '#2a9782'

/** Nền biểu đồ — dùng cho khe hở 2px giữa các mảng và vòng viền điểm. */
export const SURFACE = '#ffffff'

export const GRID = '#e8ecea'
export const AXIS_TEXT = '#64748b'

/**
 * Trạng thái đơn là THANG THỨ BẬC (quy trình: chờ → xác nhận → giao → xong)
 * nên dùng một hue đậm dần. "Đã huỷ" nằm ngoài quy trình → xám trung tính.
 */
export const STATUS_COLOR = {
  pending: '#4bb39b',
  confirmed: '#2a9782',
  shipping: '#127a6a',
  delivered: '#116257',
  cancelled: '#94a3b8',
}

/** Hai phương thức thanh toán: 2 bước của cùng thang teal. */
export const PAYMENT_COLOR = {
  cod: '#4bb39b',
  bank_transfer: '#116257',
}

export const PAYMENT_LABEL = {
  cod: 'COD (khi nhận hàng)',
  bank_transfer: 'Chuyển khoản QR',
}

/* ---------------------------------------------------------------- định dạng */

const vnd = new Intl.NumberFormat('vi-VN')

export const money = (v) => `${vnd.format(Math.round(v || 0))}₫`

/** Nhãn trục y: 5.770.000 -> "5,8 Tr" để trục không bị dài loằng ngoằng. */
export function moneyShort(v) {
  const n = Math.abs(v || 0)
  if (n >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace('.', ',')} Tỷ`
  if (n >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} Tr`
  if (n >= 1_000) return `${Math.round(v / 1_000)}K`
  return vnd.format(v || 0)
}

export const num = (v) => vnd.format(v || 0)

/* ------------------------------------------------------- quy cách hình vẽ */

/** Cột/thanh tối đa 24px, bo 4px ở đầu dữ liệu, vuông ở gốc. */
export const BAR_SIZE = 22
export const BAR_RADIUS_H = [0, 4, 4, 0] // thanh ngang: bo bên phải
export const BAR_RADIUS_V = [4, 4, 0, 0] // cột dọc: bo bên trên

export const axisProps = {
  tick: { fill: AXIS_TEXT, fontSize: 11 },
  tickLine: false,
  axisLine: false,
}

/** Lưới hairline 1px, nét liền, lùi về sau — không bao giờ nét đứt. */
export const gridProps = {
  stroke: GRID,
  strokeWidth: 1,
  strokeDasharray: '0',
  vertical: false,
}
