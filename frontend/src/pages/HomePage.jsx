import AiPromo from '../components/home/AiPromo'
import BrandGrid from '../components/home/BrandGrid'
import CategoryStrip from '../components/home/CategoryStrip'
import HeroBanner from '../components/home/HeroBanner'
import ProductSection from '../components/home/ProductSection'
import ServiceHighlights from '../components/home/ServiceHighlights'

const CATEGORY_TABS = [
  { label: 'Tất cả' },
  { label: 'Dưỡng da', category: 'duong-da' },
  { label: 'Trang điểm', category: 'trang-diem' },
  { label: 'Chống nắng', category: 'kem-chong-nang' },
  { label: 'Làm sạch', category: 'lam-sach' },
  { label: 'Chăm sóc cơ thể', category: 'cham-soc-co-the' },
]

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <ServiceHighlights />
      <CategoryStrip />
      <ProductSection
        id="bestseller-heading"
        title="Sản phẩm bán chạy"
        subtitle="Được khách hàng tin chọn và đánh giá cao nhất"
        sort="bestseller"
        tabs={CATEGORY_TABS}
        viewAllTo="/products?sort=bestseller"
        tone="tinted"
      />
      <AiPromo />
      <ProductSection
        id="newest-heading"
        title="Hàng mới về"
        subtitle="Cập nhật những sản phẩm mới nhất tại LUMI Beauty"
        sort="newest"
        tabs={CATEGORY_TABS}
        viewAllTo="/products?sort=newest"
      />
      <BrandGrid />
    </>
  )
}
