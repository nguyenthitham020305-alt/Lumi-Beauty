import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ORDER_STATUS_LABEL } from '../../order/orderLabels'
import { axisProps, BAR_RADIUS_H, BAR_SIZE, num, STATUS_COLOR } from '../../../lib/chartTheme'
import ChartCard, { LegendItem, SimpleTable, TooltipBox } from './ChartCard'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipBox
      title={d.name}
      rows={[
        { label: 'Số đơn', value: num(d.orders), color: d.fill },
        { label: 'Tỷ lệ', value: `${d.share}%` },
      ]}
    />
  )
}

export default function StatusChart({ breakdown, rangeLabel }) {
  const total = breakdown.reduce((s, d) => s + d.orders, 0)
  const data = breakdown.map((d) => ({
    ...d,
    name: ORDER_STATUS_LABEL[d.status] ?? d.status,
    fill: STATUS_COLOR[d.status],
    share: total ? Math.round((d.orders / total) * 100) : 0,
  }))

  return (
    <ChartCard
      title="Đơn hàng theo trạng thái"
      subtitle={`${rangeLabel} · đơn vị: đơn · tổng ${num(total)} đơn`}
      legend={
        <>
          <LegendItem color={STATUS_COLOR.pending} label="Quy trình xử lý: nhạt → đậm dần" />
          <LegendItem color={STATUS_COLOR.cancelled} label="Đã huỷ (ngoài quy trình)" />
        </>
      }
      empty={total === 0}
      table={
        <SimpleTable
          head={['Trạng thái', 'Số đơn', 'Tỷ lệ']}
          rows={data.map((d) => [d.name, num(d.orders), `${d.share}%`])}
        />
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" {...axisProps} width={96} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0f172a', fillOpacity: 0.04 }} />
          <Bar dataKey="orders" barSize={BAR_SIZE} radius={BAR_RADIUS_H} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.status} fill={d.fill} />
            ))}
            {/* Giá trị đặt NGOÀI đầu thanh nên không bao giờ bị thanh cắt mất chữ */}
            <LabelList
              dataKey="orders"
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
