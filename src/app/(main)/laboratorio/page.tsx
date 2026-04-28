import { SimulationTerminal } from '@/features/laboratory/components/simulation-terminal'

export default async function LaboratorioPage() {
  return (
    <div className="flex-1 overflow-auto bg-[#020617] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 italic tracking-tighter">EL LABORATORIO</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono mt-1">
              Strategy Simulation & Risk Projections
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-600 block">PROTOCOL</span>
            <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Hypothetical Simulation
            </span>
          </div>
        </header>

        <SimulationTerminal />
      </div>
    </div>
  )
}
