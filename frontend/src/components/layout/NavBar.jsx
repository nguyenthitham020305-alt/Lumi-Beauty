import { ChevronDown, LayoutGrid, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useFetch } from '../../hooks/useFetch'
import { useChat } from '../chat/ChatContext'

const MAIN_LINKS = [
  { to: '/products?category=duong-da', label: 'Dưỡng da' },
  { to: '/products?category=trang-diem', label: 'Trang điểm' },
  { to: '/products?category=cham-soc-co-the', label: 'Chăm sóc cơ thể' },
  { to: '/products?category=cham-soc-ca-nhan', label: 'Chăm sóc cá nhân' },
  { to: '/products?category=nuoc-hoa', label: 'Nước hoa' },
  { to: '/products', label: 'Tất cả sản phẩm' },
  // Bỏ mục "Thương hiệu": trang danh sách thương hiệu (/thuong-hieu) chưa được
  // làm nên bấm vào chỉ ra trang "đang xây dựng". Link tới TỪNG hãng vẫn chạy
  // qua /thuong-hieu/<slug> và qua ô tìm kiếm.
]

export default function NavBar() {
  const { data } = useFetch(() => api.categories())
  const { openChat } = useChat()
  const categories = (data?.items ?? []).filter((c) => c.product_count > 0)

  return (
    <nav aria-label="Danh mục chính" className="border-t border-slate-100">
      <div className="container-page flex h-11 items-center gap-2">
        <div className="group relative h-full">
          <button
            type="button"
            aria-haspopup="true"
            className="flex h-full items-center gap-2 bg-brand-600 px-4 text-sm font-semibold text-white"
          >
            <LayoutGrid className="size-4" aria-hidden />
            <span className="hidden sm:inline">Danh mục sản phẩm</span>
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <div className="invisible absolute top-full left-0 z-40 w-64 rounded-b-xl border border-slate-100 bg-white py-2 opacity-0 shadow-card transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="flex items-center justify-between px-4 py-2 text-sm hover:bg-brand-50 hover:text-brand-700"
              >
                {c.name}
                <span className="text-xs text-slate-400">{c.product_count}</span>
              </Link>
            ))}
          </div>
        </div>

        <ul className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {MAIN_LINKS.map((l) => (
            <li key={l.to} className="shrink-0">
              <Link
                to={l.to}
                className={`block rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700 ${
                  l.highlight ? 'text-blush-600' : 'text-slate-700'
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => openChat()}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 md:flex"
        >
          <Sparkles className="size-4" aria-hidden />
          Tư vấn AI
        </button>
      </div>
    </nav>
  )
}
