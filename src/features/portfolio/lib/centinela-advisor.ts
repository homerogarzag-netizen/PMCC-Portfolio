export type CentinelaStatus = 'PROTECTED' | 'MONITOR' | 'ROLL_PENDING' | 'HARVEST' | 'NEW_OPPORTUNITY'

export interface CentinelaDiagnosis {
  status: CentinelaStatus
  label: string
  recommendation: string
  color: string
  metrics: {
    intrinsic: number
    extrinsic: number
    openPl: number
  }
}

export function getNakedDiagnosis(
  underlyingPrice: number,
  tkScore: number
): CentinelaDiagnosis {
  const targetDelta = tkScore >= 4 ? '0.30 - 0.35 (OTM)' : 'ATM (~0.50)'
  const regimeLabel = tkScore >= 4 ? 'ESTRATEGIA CRECIMIENTO' : 'ESTRATEGIA ESCUDO'
  const regimeGoal = tkScore >= 4 
    ? 'Objetivo: Dar aire al LEAP ($5-$10) para capturar el rally.' 
    : 'Objetivo: Cobrar prima máxima para construir un escudo defensivo.'

  return {
    status: 'NEW_OPPORTUNITY',
    label: `NUEVA VENTA SUGERIDA: ${regimeLabel}`,
    recommendation: `Campaña sin corta activa. Sugerencia: Vender ${targetDelta}. ${regimeGoal}`,
    color: 'text-amber-400',
    metrics: {
      intrinsic: 0,
      extrinsic: 0,
      openPl: 0
    }
  }
}

export function getCentinelaDiagnosis(
  shortCall: { strike: number; entryPrice: number; contracts: number; expirationDate: string },
  greeks: { delta: number; theta: number; mid_iv: number },
  optionPrice: number,
  underlyingPrice: number,
  tkScore: number
): CentinelaDiagnosis {
  const isCall = true 
  const intrinsic = isCall ? Math.max(0, underlyingPrice - shortCall.strike) : Math.max(0, shortCall.strike - underlyingPrice)
  const extrinsic = Math.max(0, optionPrice - intrinsic)
  const openPl = (shortCall.entryPrice - optionPrice) * shortCall.contracts * 100

  const profitPercent = ((shortCall.entryPrice - optionPrice) / shortCall.entryPrice) * 100
  const isFriday = new Date().getDay() === 5
  const now = new Date()
  const isPowerHour = isFriday && now.getHours() >= 13 
  
  const dte = Math.ceil((new Date(shortCall.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const metrics = {
    intrinsic,
    extrinsic,
    openPl
  }

  const targetDelta = tkScore >= 4 ? '0.30 - 0.35 (OTM)' : 'ATM (~0.50)'
  const regimeGoal = tkScore >= 4 
    ? 'Objetivo: Dar aire al LEAP ($5-$10) para capturar el rally.' 
    : 'Objetivo: Cobrar prima máxima para construir un escudo defensivo.'
  
  const deltaMsg = ` Sugerencia: Vender ${targetDelta}. ${regimeGoal}`

  // 1. REGLA DE LOS CENTAVOS (Penny Rule)
  if (profitPercent >= 80) {
    return {
      status: 'HARVEST',
      label: 'PENNY RULE',
      recommendation: '80%+ de ganancia. Cerrar BTC para liberar colateral.' + deltaMsg,
      color: 'text-fuchsia-400',
      metrics
    }
  }

  // 2. PROTOCOLO POWER HOUR (Viernes ITM)
  const isITM = underlyingPrice > shortCall.strike
  if (isFriday && isPowerHour && isITM) {
    return {
      status: 'ROLL_PENDING',
      label: 'POWER HOUR ROLL',
      recommendation: 'Vencimiento ITM hoy (Viernes). Aplicar Roll Up & Out.' + deltaMsg,
      color: 'text-rose-500 font-bold animate-pulse',
      metrics
    }
  }

  // 3. MONITORIZACIÓN DE RIESGO
  const absDelta = Math.abs(greeks.delta)
  
  // ITM pero NO es viernes: El Centinela advierte pero respeta la regla de esperar
  if (isITM && !isFriday) {
    return {
      status: 'MONITOR',
      label: 'ITM - EXTRÍNSECO TRABAJANDO',
      recommendation: `Posición ITM. Mantener hasta el viernes para extraer los $${(extrinsic * 100).toFixed(2)} de extrínseco restante.` + deltaMsg,
      color: 'text-amber-400',
      metrics
    }
  }

  if (absDelta > 0.40 || dte <= 3) {
    return {
      status: 'MONITOR',
      label: 'ALERTA TÁCTICA',
      recommendation: `Delta alto (.${Math.round(absDelta * 100)}). Preparar gestión para Power Hour.` + deltaMsg,
      color: 'text-amber-400',
      metrics
    }
  }

  return {
    status: 'PROTECTED',
    label: tkScore >= 4 ? 'RÉGIMEN CRECIMIENTO' : 'CAJERO AUTOMÁTICO',
    recommendation: 'Theta trabajando a tu favor. Posición saludable.' + deltaMsg,
    color: 'text-cyan-400',
    metrics
  }
}
