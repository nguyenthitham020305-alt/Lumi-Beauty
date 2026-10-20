import { BadgeCheck, MessageCircleHeart, RefreshCcw, Truck } from 'lucide-react'

const ITEMS = [
  { icon: BadgeCheck, title: 'Chính hãng 100%', text: 'Nhập khẩu trực tiếp' },
  { icon: Truck, title: 'Miễn phí vận chuyển', text: 'Đơn hàng từ 499K' },
  { icon: RefreshCcw, title: 'Đổi trả dễ dàng', text: 'Trong vòng 7 ngày' },
  { icon: MessageCircleHeart, title: 'Tư vấn bằng AI', text: 'Gợi ý theo làn da của bạn' },
]

export default function ServiceHighlights() {
  return (
    <section className="container-page mt-5" aria-label="Cam kết của LUMI Beauty">
      <ul className="grid grid-cols-2 gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 md:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">{title}</span>
              <span className="block text-xs text-slate-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
