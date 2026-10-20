import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisProps, gridProps, money, moneyShort, num, SERIES, SURFACE } from '../../../lib/chartTheme'
import ChartCard, { SimpleTable, TooltipBox } from './ChartCard'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipBox
      title={d.label}
      rows={[
        { label: 'Doanh thu', value: money(d.revenue), color: SERIES },
        { label: 'Số đơn', value: num(d.orders) },
      ]}
    />
  )
}

export default function RevenueChart({ series, bucket, rangeLabel }) {
  const empty = !series?.length || series.every((d) => d.revenue === 0)
  const unit = bucket === 'month' ? 'tháng' : 'ngày'

  // Chỉ gắn nhãn cho mốc cao nhất — gắn hết mọi điểm sẽ rối và không ai đọc
  const peak = series?.reduce((a, b) => (b.revenue > (a?.revenue ?? -1) ? b : a), null)

  return (
    <ChartCard
      title={`Doanh thu theo ${unit}`}
      subtitle={`${rangeLabel} · đơn vị: đồng (₫) · đã trừ đơn huỷ${
        peak?.revenue > 0 ? ` · cao nhất ${peak.label}: ${money(peak.revenue)}` : ''
      }`}
      empty={empty}
      table={
        <SimpleTable
          head={[unit === 'tháng' ? 'Tháng' : 'Ngày', 'Doanh thu', 'Số đơn']}
          rows={(series ?? []).map((d) => [d.label, money(d.revenue), num(d.orders)])}
        />
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            {/* Vùng tô là lớp wash ~10%, không phải mảng màu đặc */}
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.18} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps} tickFormatter={moneyShort} width={54} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: SERIES, strokeWidth: 1, strokeOpacity: 0.45 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="url(#revFill)"
            /* Vòng 2px màu nền quanh điểm để điểm không chìm vào đường kẻ */
            activeDot={{ r: 5, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
