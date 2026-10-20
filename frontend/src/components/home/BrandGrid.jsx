import { Link } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { sizedImage } from '../../lib/format'
import SectionHeading from './SectionHeading'

export default function BrandGrid() {
  const { data, loading } = useFetch(() => api.featuredBrands(12))
  const brands = data?.items ?? []

  return (
    <section className="container-page mt-14" aria-labelledby="brand-heading">
      <SectionHeading
        title={<span id="brand-heading">Thương hiệu nổi bật</span>}
        subtitle="Hơn 180 thương hiệu chính hãng từ Hàn, Nhật, Pháp, Mỹ..."
        to="/thuong-hieu"
      />
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {loading &&
          Array.from({ length: 12 }, (_, i) => (
            <li key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" aria-hidden />
          ))}
        {brands.map((b) => (
          <li key={b.id}>
            <Link
              to={`/products?brand=${b.slug}`}
              className="group flex h-24 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-brand-200 hover:shadow-card"
            >
              <img
                src={sizedImage(b.logo_url, 200)}
                alt={b.name}
                loading="lazy"
                className="max-h-12 w-auto max-w-full object-contain grayscale-[40%] transition group-hover:grayscale-0"
              />
              <span className="mt-1.5 text-[11px] text-slate-400">{b.product_count} sản phẩm</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
