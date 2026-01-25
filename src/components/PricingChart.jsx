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
  ReferenceLine,
  Legend
} from 'recharts'

const TIER_COLORS = {
  high: '#10b981',   // emerald-500
  medium: '#f59e0b', // amber-500
  low: '#3b82f6'     // blue-500
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="font-medium text-foreground">{data.name}</p>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-mono font-medium">${data.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">GDP Ratio:</span>
          <span className="font-mono">{(data.gdpRatio * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Tier:</span>
          <span 
            className="px-2 py-0.5 rounded text-xs font-medium capitalize"
            style={{ 
              backgroundColor: `${TIER_COLORS[data.tier]}20`,
              color: TIER_COLORS[data.tier]
            }}
          >
            {data.tier}
          </span>
        </div>
      </div>
    </div>
  )
}

const CustomLegend = () => {
  return (
    <div className="flex justify-center gap-6 mt-4">
      {Object.entries(TIER_COLORS).map(([tier, color]) => (
        <div key={tier} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-muted-foreground capitalize">{tier} GDP</span>
        </div>
      ))}
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
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Select countries to see pricing chart
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.5}
          />
          <XAxis 
            dataKey="country" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(value) => `$${value}`}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine 
            y={basePrice} 
            stroke="hsl(var(--primary))" 
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: `Base: $${basePrice}`, 
              position: 'right',
              fill: 'hsl(var(--primary))',
              fontSize: 12
            }}
          />
          <Bar 
            dataKey="price" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={TIER_COLORS[entry.tier]}
                fillOpacity={0.8}
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
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="hsl(var(--border))" 
          opacity={0.5}
          horizontal={false}
        />
        <XAxis 
          type="number"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          domain={[0, 'auto']}
        />
        <YAxis 
          type="category"
          dataKey="name"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          width={70}
        />
        <Tooltip 
          formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'GDP Ratio']}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <ReferenceLine 
          x={1} 
          stroke="hsl(var(--primary))" 
          strokeDasharray="5 5"
          strokeWidth={2}
        />
        <Bar 
          dataKey="gdpRatio" 
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        >
          {sortedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={TIER_COLORS[entry.tier]}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Price Distribution Pie Chart
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
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
            style={{ backgroundColor: item.color }}
          >
            {item.value}
          </div>
          <p className="text-sm text-muted-foreground">{item.name}</p>
        </div>
      ))}
    </div>
  )
}
