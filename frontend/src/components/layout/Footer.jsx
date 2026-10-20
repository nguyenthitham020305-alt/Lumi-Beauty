import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    title: 'Về LUMI Beauty',
    links: [
      ['Giới thiệu', '/gioi-thieu'],
      ['Tuyển dụng', '/tuyen-dung'],
      ['Hệ thống cửa hàng', '/cua-hang'],
      ['Liên hệ', '/lien-he'],
    ],
  },
  {
    title: 'Hỗ trợ khách hàng',
    links: [
      ['Hướng dẫn mua hàng', '/huong-dan'],
      ['Chính sách đổi trả', '/doi-tra'],
      ['Chính sách vận chuyển', '/van-chuyen'],
      ['Câu hỏi thường gặp', '/faq'],
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-16 bg-brand-900 text-brand-100">
      <div className="bg-brand-700">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <div>
            <p className="font-display text-xl font-semibold text-white">Nhận tin từ LUMI Beauty</p>
            <p className="text-sm text-brand-100">Đăng ký để nhận thông tin sản phẩm mới và bí quyết chăm sóc da.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="flex w-full max-w-md gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              Email của bạn
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Email của bạn"
              className="h-11 min-w-0 flex-1 rounded-full bg-white px-5 text-sm text-slate-800 outline-none"
            />
            <button type="submit" className="h-11 rounded-full bg-blush-400 px-6 text-sm font-semibold text-white hover:bg-blush-500">
              Đăng ký
            </button>
          </form>
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src="/images/logo.png" alt="LUMI Beauty" className="h-16 w-auto rounded-lg bg-white p-1.5" />
          <p className="mt-4 text-sm leading-relaxed text-brand-200">
            Mỹ phẩm chính hãng cùng trợ lý AI tư vấn chăm sóc da, giúp bạn tìm đúng sản phẩm cho làn da của mình.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="font-semibold text-white">{col.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-semibold text-white">Liên hệ</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="flex gap-2">
              <MapPin className="size-4 shrink-0 translate-y-0.5" aria-hidden /> 207 Giải Phóng, Hai Bà Trưng, Hà Nội
            </li>
            <li className="flex gap-2">
              <Phone className="size-4 shrink-0 translate-y-0.5" aria-hidden /> 1900 1234
            </li>
            <li className="flex gap-2">
              <Mail className="size-4 shrink-0 translate-y-0.5" aria-hidden /> hotro@lumibeauty.vn
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-800 py-4 text-center text-xs text-brand-300">
        © {new Date().getFullYear()} LUMI Beauty. Dự án khóa luận tốt nghiệp.
      </div>
    </footer>
  )
}
