import { getCampaigns } from '../actions/get-campaigns'

export async function MetricsRibbon() {
  const campaigns = await getCampaigns()
  
  // Calculate total capital allocated as a real metric
  const totalCapital = campaigns.reduce((acc, curr) => acc + curr.capitalAllocated, 0)
  
  const items = [
    { label: 'Total Capital Allocated', value: `$${totalCapital.toLocaleString()}`, accent: 'emerald' },
    { label: 'Active Campaigns', value: campaigns.length.toString(), accent: 'zinc' },
    { label: 'GEX Exposure (Intraday)', value: 'Pending API', accent: 'zinc' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {items.map((item) => (
        <div key={item.label} className="bg-zinc-900 border border-zinc-800 p-4 rounded-md">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-1">
            {item.label}
          </p>
          <p className={`text-2xl font-mono font-bold ${item.accent === 'emerald' ? 'text-emerald-500' : 'text-zinc-100'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
