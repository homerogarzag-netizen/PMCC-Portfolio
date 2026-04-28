# MEMORY.md - Diseño de PMCC

## 📌 Estado del Proyecto
Dashboard de gestión de campañas **Poor Man's Covered Call (PMCC)** automatizado con Tradier API y Supabase.

## 🛠️ Stack Tecnológico
- **Frontend**: Next.js 16 (App Router), Tailwind CSS.
- **Backend**: Next.js Server Actions, Supabase (PostgreSQL + Auth).
- **Broker**: Tradier API (Market Data + Account History).

## 🧠 Lógica de Negocio (Reglas de Oro)
1. **Valoración de Campaña**: 
   - `Total P&L` = `Realized (Bitácora)` + `Unrealized LEAP (Market - Cost)` + `Unrealized Short (Entry Credit - Market Cost)`.
   - **Costo Base Dinámico (LEAP Rolls)**: El Costo Base (`Total Invested`) de la campaña no es solo el LEAP actual. Es la suma (en valor absoluto) de todas las transacciones etiquetadas como `Initial Capital` en la Bitácora. Esto ajusta automáticamente el costo si el LEAP anterior se cerró con pérdida o ganancia.
   
2. **Sincronización Inmutable (Delta Sync)**:
   - `syncTradierAction` implementa *Delta Sync*. Busca la fecha de la última transacción en Supabase y solo pide a Tradier los eventos nuevos a partir de esa fecha.
   - **Garantía**: El historial pasado queda congelado. Los cambios manuales hechos por el usuario NUNCA se sobrescriben.
   - Las transacciones de opciones PUT son filtradas y descartadas automáticamente (PMCC-only).

3. **La Bitácora (Fuente Única de Verdad)**:
   - Visualización granular de transacciones filtrable por Ticker.
   - Origen de datos **exclusivo** para P&L Realizado: Tabla `transactions` (Ignora el deficiente `Gain/Loss` de Tradier).
   - `Realized P&L` = Suma de todas las transacciones excepto las etiquetadas como `Initial Capital`.
   - **Auditoría Interactiva**: El usuario puede cambiar las etiquetas (`Premium`, `Roll`, `Capital`) o eliminar transacciones directamente desde la tabla para corregir errores del broker.

## ✅ Hitos Alcanzados (27 de Abril, 2026)
- **Precisión Lograda**: Se cuadró exitosamente el historial de QQQ (recuperando ~$1,600 perdidos por Tradier) y de SOFI (ajustando el costo base tras un roll con pérdida de ~$6,893).
- **Estabilidad de Datos**: La base de datos de Supabase ahora actúa como un Libro Mayor inmutable y editable por el usuario, preparándose para la arquitectura SaaS multi-usuario.

