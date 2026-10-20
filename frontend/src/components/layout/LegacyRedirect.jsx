import { Navigate, useLocation, useParams } from 'react-router-dom'

/**
 * Chuyển các URL tiếng Việt cũ (/san-pham, /danh-muc/:slug, /tim-kiem...) sang /products
 * để link đã chia sẻ trước đó vẫn dùng được.
 */
export default function LegacyRedirect({ to }) {
  const { slug } = useParams()
  const { search } = useLocation()
  const params = new URLSearchParams(search)

  const target = {
    list: () => `/products${search}`,
    detail: () => `/products/${slug}`,
    category: () => `/products?category=${slug}`,
    brand: () => `/products?brand=${slug}`,
    search: () => `/products?q=${encodeURIComponent(params.get('q') ?? '')}`,
    sale: () => '/products',
  }[to]()

  return <Navigate to={target} replace />
}
