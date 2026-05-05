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
   - **Auditoría Profunda (Deep Scan)**: Herramienta manual que compara el historial total de Tradier con Supabase para encontrar transacciones eliminadas accidentalmente (huérfanas) y permite restaurarlas con un clic.

4. **Performance & Scalability (Egress Control)**:
    - **Bulk Operations Only**: Queda prohibido el uso de `await supabase...` dentro de bucles `for/map`. Se debe usar el patrón de consulta masiva previa y comparación en memoria local.
    - **Minimal Selects**: No se debe usar `select('*')` en tablas con alto volumen como `transactions`. Siempre filtrar por las columnas mínimas necesarias para reducir el payload JSON y el costo de transferencia de Supabase.
    - **Server-Side Filtering**: Los filtros de fechas críticas (ej. Inicio de Historial) deben aplicarse en la consulta SQL de Supabase antes de que los datos viajen al cliente.

5. **Performance Snapshots (Auditoría de Valor Neto)**:
    - **Día 1 Oficial**: La analítica de rendimiento diario y mensual está fijada para iniciar el **10 de abril de 2026**. Cualquier dato previo se mantiene en la Bitácora para auditoría de Ticker pero se ignora en el Calendario.
    - **Regla de las 3:50 PM ET**: Las fotos del portafolio se toman automáticamente (on-demand). Antes de las 15:50 NY, la foto es "viva" y se actualiza. Después de las 15:50 NY, la foto se **congela** para evitar que los spreads abiertos del post-market distorsionen el P&L histórico.
    - **Snapshot Delta Logic**: El rendimiento de un día (ej. Lunes) se calcula como el delta entre su snapshot y el **último snapshot disponible** (ej. Viernes), permitiendo trazabilidad perfecta sobre fines de semana y días festivos.

## ✅ Hitos Alcanzados
- **27 de Abril, 2026**: Se cuadró exitosamente el historial de QQQ y SOFI. La base de datos de Supabase ahora actúa como un Libro Mayor inmutable y editable por el usuario.
- **28 de Abril, 2026**: Se implementó el sistema de *Auditoría Profunda* para la recuperación de transacciones borradas. Se corrigió un bug de desfase de zona horaria (UTC vs CST) que afectaba el renderizado de fechas. Todo el código fue respaldado exitosamente en GitHub (`homerogarzag-netizen/PMCC-Portfolio`).
- **30 de Abril, 2026**: **Hardening de Infraestructura (Egress Fix)**. Se resolvió un pico crítico de transferencia de datos (1.8 GB) en Supabase mediante la refactorización de `syncTradierAction` a operaciones en bloque (Bulk) y la restricción de columnas en las consultas de P&L.
- **05 de Mayo, 2026**: **Inteligencia de Desempeño V2**. 
    - Se implementó el motor de `portfolio_snapshots` para auditoría de valor neto total diaria.
    - Se migró el historial manual (19 registros) a Supabase.
    - Se rediseñaron las gráficas de Equidad y P&L Mensual para basarse en fotos reales, eliminando el ruido de transacciones pasadas.
    - **Upgrade a Supabase Pro**: Se escaló la infraestructura para soportar el crecimiento del portafolio y se optimizaron las consultas para máxima eficiencia de transferencia.


