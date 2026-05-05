'use client'

import { useState } from 'react'
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths, isWeekend
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react'
import { DailyStat } from '../actions/get-historical-performance'

interface Props {
  dailyStats: DailyStat[];
}

export function PerformanceCalendar({ dailyStats }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  
  // We want to show a clean grid, but the user image shows MON-FRI.
  // We'll calculate the interval for the whole month but only render weekdays.
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 })
  })

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Calculate month total P&L
  const monthKey = format(currentMonth, 'yyyy-MM')
  const monthTotal = dailyStats
    .filter(s => s.date.startsWith(monthKey))
    .reduce((sum, s) => sum + s.net, 0)

  return (
    <div className="bg-slate-900/50 border border-zinc-800 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="text-zinc-500" size={18} />
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-100">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
          </div>
          <div className={`text-xl font-black font-mono tracking-tighter ${monthTotal > 0 ? 'text-emerald-400' : monthTotal < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
            {monthTotal >= 0 ? '+' : ''}${monthTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-sm text-zinc-500 hover:text-zinc-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-sm text-zinc-500 hover:text-zinc-100 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid Header (Days) */}
      <div className="grid grid-cols-6 border-b border-zinc-800 bg-black/10">
        {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SEMANA'].map(day => (
          <div 
            key={day} 
            className={`py-3 text-center text-[10px] font-bold tracking-widest border-r border-zinc-800 last:border-0 ${day === 'SEMANA' ? 'text-zinc-100 bg-white/[0.03]' : 'text-zinc-600'}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-6 bg-black/5">
        {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIdx) => {
          const weekDays = days.slice(weekIdx * 7, weekIdx * 7 + 7)
          const weekTotal = weekDays.reduce((sum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const stat = dailyStats.find(s => s.date === dateStr)
            return sum + (stat?.net || 0)
          }, 0)

          return (
            <div key={`week-${weekIdx}`} className="contents">
              {weekDays.map((day, idx) => {
                if (isWeekend(day)) return null;

                const dateStr = format(day, 'yyyy-MM-dd')
                const stats = dailyStats.find(s => s.date === dateStr)
                const isCurrentMonth = format(day, 'yyyy-MM') === monthKey
                
                return (
                  <div 
                    key={dateStr} 
                    className={`min-h-[100px] p-3 border-r border-b border-zinc-800 relative transition-all group hover:bg-white/[0.02] ${stats?.net && stats.net > 0 ? 'bg-emerald-500/20' : stats?.net && stats.net < 0 ? 'bg-rose-500/20' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-mono font-bold ${isCurrentMonth ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {format(day, 'd')}
                      </span>
                      {stats && (
                        <div className={`w-1.5 h-1.5 rounded-full ${stats.net >= 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'}`} />
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {stats ? (
                        <>
                          <div className={`text-sm font-black font-mono tracking-tighter ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stats.net >= 0 ? '+' : ''}${Math.abs(stats.net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-[9px] font-bold text-zinc-300 uppercase flex items-center gap-1">
                            <Activity size={10} className="text-zinc-500" />
                            {stats.tradesCount} {stats.tradesCount === 1 ? 'pos' : 'pos'}
                          </div>
                        </>
                      ) : isCurrentMonth ? (
                        <div className="text-[9px] font-mono text-zinc-700 italic mt-1">Sin datos</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {/* Weekly Total Column */}
              <div className={`min-h-[100px] p-3 border-b border-zinc-800 flex flex-col justify-center items-center text-center ${weekTotal !== 0 ? 'bg-white/[0.05]' : 'bg-white/[0.02]'}`}>
                <div className={`text-base font-black font-mono ${weekTotal > 0 ? 'text-emerald-400' : weekTotal < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {weekTotal >= 0 ? '+' : ''}${Math.abs(weekTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Neto Semanal</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer / Legend */}
      <div className="p-4 bg-black/30 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
            <span>Ganancia Realizada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500/20 border border-rose-500/50" />
            <span>Costo de Rol / Defensa</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
          <Info size={12} />
          <span>Datos basados en ejecuciones de Bitácora</span>
        </div>
      </div>
    </div>
  )
}

function Activity({ size, className }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
