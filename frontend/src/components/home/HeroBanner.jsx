import { BadgeCheck, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { sizedImage } from '../../lib/format'
import { useChat } from '../chat/ChatContext'

const SLIDES = [
  {
    eyebrow: 'Chăm sóc da chuẩn khoa học',
    title: 'Rạng rỡ mỗi ngày cùng LUMI',
    text: 'Hơn 1.400 sản phẩm chính hãng từ 180+ thương hiệu được tin dùng.',
    cta: 'Khám phá dưỡng da',
    to: '/products?category=duong-da',
    query: { sort: 'rating', category: 'duong-da' },
    bg: 'from-brand-100 via-brand-50 to-blush-50',
    accent: 'text-brand-700',
  },
  {
    eyebrow: 'Hàng mới về',
    title: 'Khám phá sản phẩm mới nhất',
    text: 'Cập nhật liên tục son, kem nền, serum từ các thương hiệu bạn yêu thích.',
    cta: 'Xem hàng mới',
    to: '/products?sort=newest',
    query: { sort: 'newest' },
    bg: 'from-blush-100 via-blush-50 to-white',
    accent: 'text-blush-600',
  },
  {
    eyebrow: 'Bộ sưu tập trang điểm',
    title: 'Tự tin toả sáng phong cách riêng',
    text: 'Son, phấn, cushion bán chạy nhất đang chờ bạn.',
    cta: 'Xem trang điểm',
    to: '/products?category=trang-diem',
    query: { sort: 'bestseller', category: 'trang-diem' },
    bg: 'from-amber-50 via-blush-50 to-brand-50',
    accent: 'text-brand-700',
  },
]

const AUTOPLAY_MS = 5000

function SlideProducts({ query }) {
  const { data } = useFetch(() => api.products({ ...query, limit: 3, inStock: true }), [])
  const items = data?.items ?? []
  return (
    <div className="relative hidden h-full items-center justify-center sm:flex" aria-hidden>
      {items.map((p, i) => (
        <img
          key={p.id}
          src={sizedImage(p.image, 400)}
          alt=""
          className={`absolute rounded-3xl bg-white object-contain p-3 shadow-card ${
            ['z-20 size-44 lg:size-52', 'z-10 size-32 -translate-x-36 translate-y-10 -rotate-6 lg:size-36 lg:-translate-x-44', 'z-10 size-32 translate-x-36 -translate-y-10 rotate-6 lg:size-36 lg:translate-x-44'][i]
          }`}
        />
      ))}
    </div>
  )
}

export default function HeroBanner() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const { openChat } = useChat()

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [paused])

  const go = (step) => setIndex((i) => (i + step + SLIDES.length) % SLIDES.length)

  return (
    <section className="container-page mt-5 grid gap-4 lg:h-[400px] lg:grid-cols-3" aria-label="Chương trình nổi bật">
      <div
        className="relative min-w-0 overflow-hidden rounded-3xl lg:col-span-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
      >
        <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((s, i) => (
            <div
              key={s.title}
              className={`grid h-72 w-full shrink-0 grid-cols-1 items-center bg-gradient-to-br px-8 sm:h-80 sm:grid-cols-2 lg:h-[400px] lg:px-12 ${s.bg}`}
              aria-hidden={i !== index}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${SLIDES.length}`}
            >
              <div>
                <p className={`text-sm font-semibold tracking-wide uppercase ${s.accent}`}>{s.eyebrow}</p>
                <h2 className="mt-2 font-display text-3xl leading-tight font-semibold text-slate-900 lg:text-[42px]">{s.title}</h2>
                <p className="mt-3 max-w-sm text-sm text-slate-600 lg:text-base">{s.text}</p>
                <Link
                  to={s.to}
                  tabIndex={i === index ? 0 : -1}
                  className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
                >
                  {s.cta}
                </Link>
              </div>
              <SlideProducts query={s.query} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Banner trước"
          className="absolute top-1/2 left-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Banner tiếp theo"
          className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Chuyển tới banner ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-brand-600' : 'w-2 bg-slate-300'}`}
            />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:h-full lg:grid-cols-1 lg:grid-rows-2">
        <Link
          to="/products"
          className="group relative flex h-44 flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-blush-100 via-blush-50 to-white px-6 py-4 lg:h-auto"
        >
          <BadgeCheck
            className="absolute -right-4 -bottom-6 size-36 text-blush-200 transition duration-500 group-hover:scale-110"
            aria-hidden
          />
          <span className="text-xs font-semibold tracking-wide text-blush-600 uppercase">Cam kết của LUMI</span>
          <span className="mt-2 font-display text-xl font-semibold text-slate-900 lg:text-2xl">100% chính hãng</span>
          <span className="mt-1 max-w-[16rem] text-sm text-slate-600">Hơn 1.400 sản phẩm từ 180+ thương hiệu, giá niêm yết minh bạch.</span>
          <span className="mt-3 w-fit rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white group-hover:bg-brand-700">
            Mua sắm ngay
          </span>
        </Link>
        <button
          type="button"
          onClick={() => openChat()}
          className="group relative flex h-44 min-h-0 flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-4 text-left text-white lg:h-auto"
        >
          <img
            src="/images/logo-mark.png"
            alt=""
            className="absolute -right-6 -bottom-8 size-44 opacity-25 brightness-0 invert transition duration-500 group-hover:scale-110"
          />
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3.5" aria-hidden /> Mới
          </span>
          <span className="mt-2 font-display text-xl font-semibold lg:text-2xl">Hỏi Lumi - trợ lý AI</span>
          <span className="mt-1 max-w-[16rem] text-sm text-brand-100">Tư vấn sản phẩm theo loại da của bạn chỉ trong vài giây.</span>
          <span className="mt-3 w-fit rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 group-hover:bg-brand-50">
            Chat ngay
          </span>
        </button>
      </div>
    </section>
  )
}
