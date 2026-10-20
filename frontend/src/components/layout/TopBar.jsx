import { Phone, ShieldCheck, Truck } from 'lucide-react'

export default function TopBar() {
  return (
    <div className="bg-brand-700 text-xs text-brand-50">
      <div className="container-page flex h-9 items-center justify-between gap-4">
        <p className="flex items-center gap-2 truncate">
          <Truck className="size-4 shrink-0" aria-hidden />
          Miễn phí vận chuyển cho đơn từ 499K
        </p>
        <div className="hidden items-center gap-6 md:flex">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4" aria-hidden /> Cam kết chính hãng 100%
          </span>
          <a href="tel:19001234" className="flex items-center gap-1.5 hover:text-white">
            <Phone className="size-4" aria-hidden /> Hotline: 1900 1234
          </a>
        </div>
      </div>
    </div>
  )
}
