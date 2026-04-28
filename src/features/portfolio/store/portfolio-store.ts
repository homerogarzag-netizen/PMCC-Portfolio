import { create } from 'zustand'

interface Campaign {
  ticker: string
  leapStrike: string
  shortCallStrike: string
  capitalAllocated: number
  warChest: number
  targetRoi: number
  adjustedCostBasis: number
  status: 'active' | 'rolled' | 'closed' | 'defensive'
}

interface PortfolioState {
  metrics: {
    netTheta: number
    betaWeightedDelta: number
    notionalLeverage: number
  }
  campaigns: Campaign[]
}

export const usePortfolioStore = create<PortfolioState>(() => ({
  metrics: {
    netTheta: 45.20,
    betaWeightedDelta: 12.5,
    notionalLeverage: 1.8,
  },
  campaigns: [
    {
      ticker: 'MSFT',
      leapStrike: '400C 2026',
      shortCallStrike: '450C 30DTE',
      capitalAllocated: 12500.00,
      warChest: 2500.00,
      targetRoi: 18.5,
      adjustedCostBasis: 11200.00,
      status: 'active',
    },
    {
      ticker: 'AAPL',
      leapStrike: '180C 2026',
      shortCallStrike: '210C 30DTE',
      capitalAllocated: 8400.00,
      warChest: 1500.00,
      targetRoi: 12.0,
      adjustedCostBasis: 7900.00,
      status: 'active',
    },
  ],
}))
