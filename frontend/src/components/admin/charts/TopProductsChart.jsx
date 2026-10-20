import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisProps, BAR_RADIUS_H, BAR_SIZE, money, num, SERIES } from '../../../lib/chartTheme'
import ChartCard, { SimpleTable, TooltipBox } from './ChartCard'

/** Tên mỹ phẩm rất dài -> cắt cho trục y, bản đầy đủ nằm ở tooltip và bảng. */
const shorten = (name, max = 30) => (name.length > max ? `${name.slice(0, max).trimEnd()}…` : name)

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipBox
      title={d.name}
      rows={[
        { label: 'Đã bán', value: `${num(d.quantity)} sản phẩm`, color: SERIES },
        { label: 'Doanh thu', value: money(d.revenue) },
      ]}
    />
  )
}

export default function TopProductsChart({ products, rangeLabel }) {
  // Danh mục KHÔNG có thứ tự tự nhiên -> tất cả thanh dùng CHUNG một màu.
  // Tô đậm dần theo giá trị sẽ mã hoá lặp thông tin mà độ dài thanh đã nói rồi.
  const data = (products ?? []).map((p) => ({ ...p, short: shorten(p.name) }))

  return (
    <ChartCard
      title="Sản phẩm bán chạy"
      subtitle={`${rangeLabel} · đơn vị: sản phẩm đã bán · tối đa 7 mục`}
      empty={data.length === 0}
      table={
        <SimpleTable
          head={['Sản phẩm', 'Đã bán', 'Doanh thu']}
          rows={data.map((p) => [p.name, num(p.quantity), money(p.revenue)])}
        />
      }
    >
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40 + 20)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 4, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="short" {...axisProps} width={190} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0f172a', fillOpacity: 0.04 }} />
          <Bar dataKey="quantity" fill={SERIES} barSize={BAR_SIZE} radius={BAR_RADIUS_H} isAnimationActive={false}>
            <LabelList
              dataKey="quantity"
              position="right"
              offset={8}
              fill="#334155"
              fontSize={12}
              fontWeight={600}
              formatter={(v) => num(v)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
