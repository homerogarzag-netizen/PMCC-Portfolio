'use client'

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ReferenceLine
} from 'recharts'
import { HistoricalDataPoint, PerformanceStats, TickerContribution, DailyStat } from '../actions/get-historical-performance'
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Activity, AlertCircle, PieChart } from 'lucide-react'
import { PerformanceCalendar } from './performance-calendar'

interface Props {
  data: HistoricalDataPoint[];
  stats: PerformanceStats;
  tickerStats: TickerContribution[];
  dailyStats: DailyStat[];
}

export function PerformanceCharts({ data, stats, tickerStats, dailyStats }: Props) {
  if (!stats) return null;

  return (
    <div className="space-y-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Profit Realizado Total" 
          value={`$${stats.totalRealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue="Desde Dic 2025"
          icon={<DollarSign className="text-emerald-500" size={16} />}
          color="emerald"
        />
        <StatCard 
          title="Promedio Mensual" 
          value={`$${stats.avgMonthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue="Flujo de Caja Neto"
          icon={<CalendarIcon className="text-blue-500" size={16} />}
          color="blue"
        />
        <StatCard 
          title="Mejor Mes" 
          value={`$${stats.bestMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue="Ingreso Máximo"
          icon={<TrendingUp className="text-cyan-500" size={16} />}
          color="cyan"
        />
        <StatCard 
          title="Máximo Drawdown" 
          value={`$${stats.maxDrawdown.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue="Mayor caída de flujo"
          icon={<AlertCircle className="text-rose-500" size={16} />}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Cumulative Equity Curve */}
        <div className="bg-slate-900/50 border border-zinc-800 p-6 rounded-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Curva de Equidad Realizada</h3>
              <p className="text-[10px] text-zinc-600 font-mono">Flujo de caja acumulado (Sin contar valor LEAP)</p>
            </div>
            <Activity className="text-zinc-700" size={20} />
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCumulative)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Net Performance */}
        <div className="bg-slate-900/50 border border-zinc-800 p-6 rounded-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Desempeño Neto Mensual</h3>
              <p className="text-[10px] text-zinc-600 font-mono">Primas cobradas - Costos de Rol</p>
            </div>
            <TrendingUp className="text-zinc-700" size={20} />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip isBar />} />
                <ReferenceLine y={0} stroke="#27272a" />
                <Bar dataKey="net">
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.net >= 0 ? '#10b981' : '#f43f5e'} 
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Psychology Insight Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard 
          title="Efecto 'Sueldo'"
          description="Tu win rate mensual es del 85%. Esto significa que la mayoría de los meses logras extraer rentas positivas a pesar de la volatilidad del mercado."
          status={stats.winRate > 75 ? 'positive' : 'neutral'}
        />
        <InsightCard 
          title="Fricción de Roles"
          description="En meses alcistas fuertes, los costos de rol aumentan. El drawdown máximo de $4.3k ocurrió en el rally de Enero, compensado por la apreciación del LEAP."
          status="neutral"
        />
        <InsightCard 
          title="Eficiencia de Flujo"
          description={`Extraes un promedio de $${stats.avgMonthlyIncome.toFixed(0)} por mes. Esto cubre el costo base de tus LEAPs de forma sistemática.`}
          status="positive"
        />
      </div>

      {/* Ticker Breakdown Table */}
      <div className="bg-slate-900/50 border border-zinc-800 rounded-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-100">Desglose por Ticker (Cruce de Datos)</h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">Verificación de rentabilidad por símbolo vs Bitácora</p>
          </div>
          <PieChart className="text-zinc-700" size={20} />
        </div>
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="text-left border-b border-zinc-800 bg-black/20 text-zinc-500">
              <th className="px-6 py-3 font-bold uppercase tracking-wider">Ticker</th>
              <th className="px-6 py-3 font-bold uppercase tracking-wider text-right">Income (Primas)</th>
              <th className="px-6 py-3 font-bold uppercase tracking-wider text-right">Expense (Roles)</th>
              <th className="px-6 py-3 font-bold uppercase tracking-wider text-right">Realizado Neto</th>
              <th className="px-6 py-3 font-bold uppercase tracking-wider text-right text-zinc-400">Valorización LEAP</th>
              <th className="px-6 py-3 font-bold uppercase tracking-wider text-right text-zinc-500">Short P/L</th>
              <th className="px-6 py-3 font-bold uppercase tracking-wider text-right bg-emerald-500/10 text-emerald-500">Total P&L (Neto)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tickerStats.map((t) => (
              <tr key={t.ticker} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-bold text-zinc-100">{t.ticker}</td>
                <td className="px-6 py-4 text-right text-emerald-500 font-bold">+${t.income.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-rose-500">-${Math.abs(t.expense).toLocaleString()}</td>
                <td className={`px-6 py-4 text-right font-bold ${t.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ${t.net.toLocaleString()}
                </td>
                <td className={`px-6 py-4 text-right font-mono ${t.leapUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.leapUnrealized >= 0 ? '+' : ''}${t.leapUnrealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className={`px-6 py-4 text-right font-mono ${t.shortUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.shortUnrealized >= 0 ? '+' : ''}${t.shortUnrealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className={`px-6 py-4 text-right font-bold text-lg ${t.totalNet >= 0 ? 'text-emerald-500' : 'text-rose-500'} bg-white/[0.01]`}>
                  ${t.totalNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-black/40 font-bold border-t border-zinc-700">
            <tr>
              <td className="px-6 py-4 text-zinc-100 uppercase tracking-widest text-[9px]">Totales</td>
              <td className="px-6 py-4 text-right text-emerald-500">
                +${tickerStats.reduce((acc, t) => acc + t.income, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right text-rose-500">
                -${Math.abs(tickerStats.reduce((acc, t) => acc + t.expense, 0)).toLocaleString()}
              </td>
              <td className={`px-6 py-4 text-right ${tickerStats.reduce((acc, t) => acc + t.net, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${tickerStats.reduce((acc, t) => acc + t.net, 0).toLocaleString()}
              </td>
              <td className={`px-6 py-4 text-right ${tickerStats.reduce((acc, t) => acc + t.leapUnrealized, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${tickerStats.reduce((acc, t) => acc + t.leapUnrealized, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className={`px-6 py-4 text-right ${tickerStats.reduce((acc, t) => acc + t.shortUnrealized, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${tickerStats.reduce((acc, t) => acc + t.shortUnrealized, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className={`px-6 py-4 text-right text-xl ${tickerStats.reduce((acc, t) => acc + t.totalNet, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'} bg-emerald-500/10`}>
                ${tickerStats.reduce((acc, t) => acc + t.totalNet, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Daily P/L Calendar */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-zinc-500" size={20} />
          <h2 className="text-xl font-bold tracking-tight italic uppercase">Consistencia Diaria</h2>
        </div>
        <PerformanceCalendar dailyStats={dailyStats} />
      </div>
    </div>
  )
}

function StatCard({ title, value, subValue, icon, color }: any) {
  const colors: any = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    rose: 'border-rose-500/20 bg-rose-500/5',
  }

  return (
    <div className={`p-5 rounded-sm border ${colors[color]}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold tracking-tighter text-zinc-100">{value}</div>
      <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">{subValue}</div>
    </div>
  )
}

function InsightCard({ title, description, status }: any) {
  return (
    <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'positive' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{title}</h4>
      </div>
      <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">{description}</p>
    </div>
  )
}

function CustomTooltip({ active, payload, label, isBar }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-900 border border-zinc-800 p-3 shadow-2xl rounded-sm">
        <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2 border-b border-zinc-800 pb-1">{label}</p>
        <div className="space-y-1">
          {isBar ? (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Primas:</span>
                <span className="text-[10px] text-emerald-500 font-bold">+${data.income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Roles:</span>
                <span className="text-[10px] text-rose-500 font-bold">-${data.expense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-zinc-800 pt-1 mt-1">
                <span className="text-[10px] text-zinc-100 font-bold uppercase">Neto:</span>
                <span className={`text-[10px] font-bold ${data.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ${data.net.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-4">
              <span className="text-[10px] text-emerald-500 font-bold uppercase">Acumulado:</span>
              <span className="text-[10px] text-emerald-500 font-bold">${data.cumulative.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}
