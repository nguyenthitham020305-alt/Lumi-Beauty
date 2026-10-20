import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { sizedImage } from '../../lib/format'

export default function ImageGallery({ images, name }) {
  const [active, setActive] = useState(0)
  const list = images.length ? images : [null]
  const go = (step) => setActive((i) => (i + step + list.length) % list.length)

  return (
    <div className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <img src={sizedImage(list[active], 700)} alt={`${name} - ảnh ${active + 1}`} className="size-full object-contain p-6" />
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Ảnh trước"
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Ảnh tiếp theo"
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {list.map((url, i) => (
            <li key={url ?? i} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === active}
                className={`size-18 overflow-hidden rounded-xl border-2 bg-white transition ${
                  i === active ? 'border-brand-500' : 'border-slate-100 hover:border-brand-200'
                }`}
              >
                <img src={sizedImage(url, 150)} alt="" loading="lazy" className="size-full object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
