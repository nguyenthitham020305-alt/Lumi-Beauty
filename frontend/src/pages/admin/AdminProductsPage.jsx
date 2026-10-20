import { FolderTree, Package } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import CategoriesPanel from '../../components/admin/CategoriesPanel'
import ProductsPanel from '../../components/admin/ProductsPanel'

const TABS = [
  { id: 'san-pham', label: 'Sản phẩm', icon: Package },
  { id: 'danh-muc', label: 'Danh mục', icon: FolderTree },
]

const SUBTITLE = {
  'san-pham': 'Thêm, sửa, xoá và theo dõi tồn kho sản phẩm trong cửa hàng.',
  'danh-muc': 'Quản lý danh mục để phân loại sản phẩm trên cửa hàng.',
}

export default function AdminProductsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'danh-muc' ? 'danh-muc' : 'san-pham'

  // Mỗi tab có bộ lọc riêng trên URL; đổi tab thì xoá hết để không mang
  // bộ lọc của tab cũ sang (vd ?status=hidden không có nghĩa ở tab danh mục)
  const switchTab = (id) => setParams(id === 'san-pham' ? {} : { tab: id }, { replace: true })

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">Quản lý sản phẩm</h1>
      <p className="mt-1 text-sm text-slate-500">{SUBTITLE[tab]}</p>

      <div className="mt-6 border-b border-slate-200">
        <div className="flex gap-1" role="tablist" aria-label="Chọn nội dung quản lý">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchTab(id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* key: đổi tab là unmount panel cũ, tránh giữ lại state lọc/tìm kiếm */}
      <div className="mt-5">
        {tab === 'danh-muc' ? <CategoriesPanel key="danh-muc" /> : <ProductsPanel key="san-pham" />}
      </div>
    </>
  )
}
