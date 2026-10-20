import { Link } from 'react-router-dom'

export default function ComingSoonPage() {
  return (
    <section className="container-page flex flex-col items-center py-24 text-center">
      <img src="/images/logo-mark.png" alt="" className="size-32" />
      <h1 className="mt-4 font-display text-3xl font-semibold text-slate-900">Trang đang được xây dựng</h1>
      <p className="mt-2 text-slate-500">LUMI Beauty sẽ sớm ra mắt tính năng này. Bạn quay lại sau nhé!</p>
      <Link to="/" className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
        Về trang chủ
      </Link>
    </section>
  )
}
