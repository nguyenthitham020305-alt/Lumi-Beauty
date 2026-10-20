import { CornerDownRight, FolderOpen, FolderSearch, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'
import CategoryFormModal from './CategoryFormModal'

const SEARCH_DEBOUNCE_MS = 400

export default function CategoriesPanel() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''

  const [searchText, setSearchText] = useState(q)
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const { data, loading, error } = useFetch(() => api.adminCategories(q), [q, reloadKey])

  useEffect(() => {
    if (searchText.trim() === q) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams({ tab: 'danh-muc' })
      if (searchText.trim()) next.set('q', searchText.trim())
      setParams(next, { replace: true })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  const reload = () => setReloadKey((k) => k + 1)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (category) => {
    setEditing(category)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      const res = await api.deleteCategory(deleting.id)
      toast(`Đã xoá danh mục "${res.name}"`)
      setDeleting(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const categories = data?.items ?? []
  const nameById = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const blocked = deleting?.product_count > 0

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="size-4" aria-hidden /> Thêm danh mục
        </button>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <label className="relative block max-w-md">
            <span className="sr-only">Tìm theo tên hoặc mô tả danh mục</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo tên hoặc mô tả danh mục..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        {error ? (
          <p className="m-4 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error.message}</p>
        ) : !data ? (
          <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải danh mục...
          </p>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <FolderSearch className="mx-auto size-12 text-slate-300" aria-hidden />
            <p className="mt-3 font-semibold text-slate-700">
              {q ? 'Không có danh mục phù hợp' : 'Chưa có danh mục nào'}
            </p>
            <p className="mt-1 text-sm text-slate-500">{q ? 'Thử đổi từ khoá tìm kiếm.' : 'Bấm "Thêm danh mục" để tạo mới.'}</p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
            {/* Bảng cho màn hình lớn */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 font-medium">Tên danh mục</th>
                    <th className="px-4 py-3 font-medium">Mô tả</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Số sản phẩm</th>
                    <th className="px-4 py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                          <span className="font-mono">/{c.slug}</span>
                          {c.parent_id && nameById[c.parent_id] && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <CornerDownRight className="size-3" aria-hidden /> thuộc {nameById[c.parent_id]}
                            </span>
                          )}
                          {c.child_count > 0 && <span className="text-slate-500">· {c.child_count} danh mục con</span>}
                        </p>
                      </td>
                      <td className="max-w-[320px] px-4 py-3">
                        {c.description ? (
                          <p className="truncate text-slate-600" title={c.description}>
                            {c.description}
                          </p>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {c.product_count > 0 ? (
                          <Link
                            to={`/admin/san-pham?category=${c.id}`}
                            className="font-semibold text-brand-700 hover:underline"
                            title={`Xem ${c.product_count} sản phẩm thuộc danh mục này`}
                          >
                            {c.product_count}
                          </Link>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            title="Sửa"
                            aria-label={`Sửa danh mục ${c.name}`}
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(c)}
                            title={c.product_count > 0 ? 'Còn sản phẩm, chưa xoá được' : 'Xoá'}
                            aria-label={`Xoá danh mục ${c.name}`}
                            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:border-blush-300 hover:text-blush-600"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thẻ cho mobile */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {categories.map((c) => (
                <li key={c.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        #{c.id} · /{c.slug}
                      </p>
                      {c.parent_id && nameById[c.parent_id] && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <CornerDownRight className="size-3" aria-hidden /> thuộc {nameById[c.parent_id]}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {c.product_count} SP
                    </span>
                  </div>
                  {c.description && <p className="line-clamp-2 text-sm text-slate-600">{c.description}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      <Pencil className="size-3.5" aria-hidden /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(c)}
                      className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blush-600"
                    >
                      <Trash2 className="size-3.5" aria-hidden /> Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {data && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <FolderOpen className="size-3.5" aria-hidden /> {data.total} danh mục
        </p>
      )}

      <CategoryFormModal
        open={formOpen}
        category={editing}
        allCategories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      {/* Còn sản phẩm thì hộp thoại chỉ để thông báo, không cho bấm xoá */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={blocked ? 'Chưa thể xoá danh mục này' : 'Xoá danh mục này?'}
        confirmLabel={blocked ? 'Xem sản phẩm' : 'Xoá danh mục'}
        danger={!blocked}
        busy={deleteBusy}
        onConfirm={blocked ? () => setDeleting(null) : confirmDelete}
        onClose={() => !deleteBusy && setDeleting(null)}
      >
        {blocked ? (
          <>
            <p>
              Danh mục <strong className="text-slate-800">{deleting?.name}</strong> đang có{' '}
              <strong className="text-blush-600">{deleting?.product_count} sản phẩm</strong>.
            </p>
            <p className="mt-2">
              Hãy chuyển các sản phẩm này sang danh mục khác trước, rồi quay lại xoá. Nếu xoá ngay, chúng sẽ mất danh mục
              và biến mất khỏi mọi trang duyệt của khách.
            </p>
            <p className="mt-3">
              <Link
                to={`/admin/san-pham?category=${deleting?.id}`}
                onClick={() => setDeleting(null)}
                className="font-semibold text-brand-700 underline"
              >
                Mở danh sách {deleting?.product_count} sản phẩm này
              </Link>
            </p>
          </>
        ) : (
          <>
            <p>
              Danh mục <strong className="text-slate-800">{deleting?.name}</strong> hiện không có sản phẩm nào. Thao tác
              này không hoàn tác được.
            </p>
            {deleting?.child_count > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {deleting.child_count} danh mục con sẽ trở thành danh mục gốc, không bị xoá theo.
              </p>
            )}
          </>
        )}
      </ConfirmDialog>
    </>
  )
}
