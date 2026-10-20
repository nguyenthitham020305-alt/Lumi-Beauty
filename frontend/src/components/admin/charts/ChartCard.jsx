import { Table2 } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * Khung chung cho mọi biểu đồ: tiêu đề, chú thích đơn vị, nút xem dạng bảng.
 *
 * Bảng dữ liệu là bắt buộc chứ không phải tiện ích thêm: người dùng trình đọc
 * màn hình, người không phân biệt được màu, và cả lúc in ra giấy đều cần nó.
 */
export default function ChartCard({ title, subtitle, legend, table, empty, children }) {
  const [showTable, setShowTable] = useState(false)
  const id = useId()

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5" aria-labelledby={id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            <Table2 className="size-3.5" aria-hidden />
            {showTable ? 'Xem biểu đồ' : 'Xem bảng'}
          </button>
        )}
      </div>

      {legend && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">{legend}</div>}

      <div className="mt-4">
        {empty ? (
          <p className="grid h-[220px] place-items-center text-center text-sm text-slate-400">
            Chưa có dữ liệu trong khoảng thời gian này
          </p>
        ) : showTable ? (
          <div className="max-h-[260px] overflow-auto">{table}</div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/** Một mục chú thích: ô màu + nhãn chữ. Chữ KHÔNG mang màu dữ liệu. */
export function LegendItem({ color, label, value }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
      {value != null && <strong className="font-semibold text-slate-800">{value}</strong>}
    </span>
  )
}

/** Hộp tooltip dùng chung, giữ cùng một hình thức ở mọi biểu đồ. */
export function TooltipBox({ title, rows }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {title && <p className="font-semibold text-slate-800">{title}</p>}
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 whitespace-nowrap text-slate-600">
            {r.color && <span className="size-2 rounded-sm" style={{ background: r.color }} aria-hidden />}
            {r.label}: <strong className="font-semibold text-slate-800">{r.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SimpleTable({ head, rows }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className={`px-3 py-2 ${j > 0 ? 'text-right tabular-nums text-slate-800' : 'text-slate-600'}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
