import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'

// GDP tiers are told apart by neutral steps, not hues. The amber highlight
// (--chart-1) is kept for the one reference that matters: the base price.
const TIER_COLORS = {
  high: 'var(--chart-2)',
  medium: 'var(--chart-3)',
  low: 'var(--chart-5)'
}

const HIGHLIGHT = 'var(--chart-1)'
const GRID = 'var(--border)'
const AXIS_TICK = { fill: 'var(--faint)', fontSize: 12, fontFamily: 'var(--font-mono)' }
const AXIS_LINE = { stroke: 'var(--border)' }
const CURSOR = { fill: 'var(--foreground)', fillOpacity: 0.04 }

const formatPrice = (value) => `$${Number(value).toFixed(2)}`

const TierTag = ({ tier }) => (
  <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-1.5 text-xs text-muted-foreground">
    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: TIER_COLORS[tier] }} />
    {tier}
  </span>
)

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-popover border border-border rounded-lg shadow-sm p-3 min-w-[180px] font-sans">
      <p className="text-sm font-medium text-foreground">{data.name}</p>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Price</span>
          <span className="font-medium tabular-nums">{formatPrice(data.price)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">GDP ratio</span>
          <span className="tabular-nums">{(data.gdpRatio * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-muted-foreground">Tier</span>
          <TierTag tier={data.tier} />
        </div>
      </div>
    </div>
  )
}

const CustomLegend = () => {
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
      {Object.entries(TIER_COLORS).map(([tier, color]) => (
        <div key={tier} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-xs"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-muted-foreground capitalize">{tier} GDP</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="w-4 border-t-2 border-dashed" style={{ borderColor: HIGHLIGHT }} />
        <span className="text-xs text-muted-foreground">Base price</span>
      </div>
    </div>
  )
}

export default function PricingChart({ data, basePrice }) {
  // Sort data by price descending for better visualization
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.price - a.price)
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        Select countries to see the pricing chart
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 32, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            stroke={GRID}
            vertical={false}
          />
          <XAxis
            dataKey="country"
            tick={AXIS_TICK}
            tickLine={AXIS_LINE}
            axisLine={AXIS_LINE}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} cursor={CURSOR} />
          <ReferenceLine
            y={basePrice}
            stroke={HIGHLIGHT}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `Base ${formatPrice(basePrice)}`,
              position: 'insideTopRight',
              fill: 'var(--highlight-ink)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)'
            }}
          />
          <Bar
            dataKey="price"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={TIER_COLORS[entry.tier]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  )
}

// GDP Comparison Chart Component
export function GDPComparisonChart({ data }) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.gdpRatio - a.gdpRatio)
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 20, right: 32, left: 80, bottom: 20 }}
      >
        <CartesianGrid
          stroke={GRID}
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          domain={[0, 'auto']}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={AXIS_LINE}
          axisLine={AXIS_LINE}
          width={70}
        />
        <Tooltip
          cursor={CURSOR}
          formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'GDP ratio']}
          contentStyle={{
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
            fontVariantNumeric: 'tabular-nums'
          }}
          labelStyle={{ color: 'var(--foreground)' }}
          itemStyle={{ color: 'var(--muted-foreground)' }}
        />
        <ReferenceLine
          x={1}
          stroke={HIGHLIGHT}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <Bar
          dataKey="gdpRatio"
          radius={[0, 3, 3, 0]}
          maxBarSize={20}
        >
          {sortedData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={TIER_COLORS[entry.tier]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Price distribution per GDP tier, as plain figures
export function PriceDistributionChart({ data }) {
  const distribution = useMemo(() => {
    const tiers = { high: 0, medium: 0, low: 0 }
    data.forEach(d => {
      tiers[d.tier]++
    })
    return Object.entries(tiers).map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
      color: TIER_COLORS[tier]
    }))
  }, [data])

  return (
    <div className="flex items-center justify-center gap-8">
      {distribution.map(item => (
        <div key={item.name} className="text-center">
          <div className="text-2xl font-medium tabular-nums text-foreground mb-1">
            {item.value}
          </div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-faint">
            <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: item.color }} />
            {item.name}
          </p>
        </div>
      ))}
    </div>
  )
}
