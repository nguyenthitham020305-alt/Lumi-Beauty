import { Link } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { sizedImage } from '../../lib/format'
import SectionHeading from './SectionHeading'

export default function CategoryStrip() {
  const { data, loading } = useFetch(() => api.categories())
  const categories = (data?.items ?? []).filter((c) => c.image && c.product_count > 0)

  return (
    <section className="container-page mt-12" aria-labelledby="category-heading">
      <SectionHeading title={<span id="category-heading">Danh mục nổi bật</span>} />
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:px-0 lg:grid-cols-9">
        {loading &&
          Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="w-24 shrink-0 animate-pulse md:w-auto" aria-hidden>
              <div className="mx-auto aspect-square w-20 rounded-full bg-slate-100 md:w-24" />
              <div className="mx-auto mt-2 h-3 w-16 rounded bg-slate-100" />
            </li>
          ))}
        {categories.map((c) => (
          <li key={c.id} className="w-24 shrink-0 md:w-auto">
            <Link to={`/products?category=${c.slug}`} className="group block text-center">
              <span className="mx-auto grid aspect-square w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-blush-50 ring-1 ring-brand-100 transition group-hover:ring-2 group-hover:ring-brand-400 md:w-24">
                <img
                  src={sizedImage(c.image, 200)}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition duration-300 group-hover:scale-110"
                />
              </span>
              <span className="mt-2 block text-sm font-medium text-slate-700 group-hover:text-brand-700">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
