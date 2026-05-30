'use client'

type KPI = { label: string; value: string; change: string; trend: 'up' | 'down' | 'neutral' }

export default function KPIDashboardClient({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: '#f2f2f2' }}
      >
        KPI Dashboard
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9a9a9a' }}>
        Indicadores clave de rendimiento del marketplace
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const trendColor =
            kpi.trend === 'up' ? '#4ade80' : kpi.trend === 'down' ? '#ef4444' : '#9a9a9a'
          return (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="text-xs mb-2" style={{ color: '#a0a0a0' }}>
                {kpi.label}
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: '#f2f2f2' }}>
                {kpi.value}
              </div>
              {kpi.change && (
                <div className="text-xs flex items-center gap-1" style={{ color: trendColor }}>
                  {kpi.change}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
