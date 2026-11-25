import { Search, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import AccountMenu from './AccountMenu'

const HOT_KEYWORDS = ['Kem chống nắng', 'Tẩy trang', 'Serum', 'Son kem', 'Sữa rửa mặt']

export default function Header() {
  const [keyword, setKeyword] = useState('')
  const navigate = useNavigate()
  const { count: cartCount, openCart } = useCart()

  const search = (q) => {
    const value = q.trim()
    if (value) navigate(`/products?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="container-page flex items-center gap-3 py-3 md:gap-8">
      <Link to="/" className="shrink-0" aria-label="LUMI Beauty - Trang chủ">
        <img src="/images/logo.png" alt="LUMI Beauty" className="h-11 w-auto md:h-16" />
      </Link>

      <div className="min-w-0 flex-1">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            search(keyword)
          }}
          className="flex h-11 items-center rounded-full border-2 border-brand-600 bg-white pl-5 focus-within:ring-4 focus-within:ring-brand-100"
        >
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm sản phẩm, thương hiệu bạn mong muốn..."
            aria-label="Tìm kiếm sản phẩm"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="m-1 flex h-8 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden sm:inline">Tìm kiếm</span>
          </button>
        </form>
        <div className="no-scrollbar mt-1.5 hidden gap-3 overflow-x-auto pl-5 text-xs text-slate-500 md:flex">
          {HOT_KEYWORDS.map((k) => (
            <button key={k} type="button" onClick={() => search(k)} className="shrink-0 hover:text-brand-600">
              {k}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label="Tài khoản" className="flex shrink-0 items-center gap-1 md:gap-3">
        <AccountMenu />
        <button type="button" onClick={openCart} aria-label={`Mở giỏ hàng, ${cartCount} sản phẩm`} className="relative rounded-full p-2 hover:bg-brand-50">
          <ShoppingBag className="size-6 text-brand-600" aria-hidden />
          <span className="absolute top-0.5 right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-blush-500 px-1 text-[10px] font-bold text-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        </button>
      </nav>
    </div>
  )
}
