# Análisis de Costos Operativos y Fiscales — Exención de Comisiones

> **Objetivo:** Evaluar la viabilidad financiera de ofrecer una exención temporal de comisiones (15 días) como estrategia de crecimiento para Turpial Market.

---

## 1. Costos Fijos Mensuales

| Concepto | Proveedor | Costo Mensual Estimado (USD) |
|----------|-----------|------------------------------|
| Hosting + Serverless | Vercel (Pro) | $20 |
| Base de datos | Neon / Supabase | $0 (free tier) → $25 (scaled) |
| Email transaccional | Resend | $0 (hasta 3,000 emails/mes) |
| WhatsApp Business API | Evolution API / Meta | $0 (hasta 1,000 conversaciones/mes) |
| Dominio | Namecheap | ~$1.50 |
| Almacenamiento (blobs) | Vercel Blob | $0 (hasta 10GB) |
| CDN / Edge | Vercel incluido | $0 |
| **Total mensual estimado** | | **$21.50 — $46.50** |

---

## 2. Carga Fiscal Estimada (Venezuela)

| Concepto | Base Imponible | Alícuota | Estimado Mensual (USD) |
|----------|---------------|----------|-------------------------|
| IVA (16%) | Ingresos por comisiones | 16% | Variable según ingresos |
| ISLR (34%) | Utilidad neta | 34% | Variable según utilidad |
| Impuestos municipales | Ingresos brutos | 0.5-3% | Variable según municipio |
| Contribución parafiscal | Nómina (si hay empleados) | 2% | $0 (sin nómina actual) |

> **Nota:** Turpial Sound opera como persona natural/empresa en Venezuela. Las alícuotas son referenciales y dependen de la estructura legal final.

---

## 3. Proyección de Ingresos por Comisiones

| Escenario | Transacciones/mes | Ticket promedio (USD) | Comisión 5% (USD) | Neto post-fees (USD) |
|-----------|-------------------|----------------------|-------------------|---------------------|
| **Bajo** | 10 | $80 | $40 | ~$0 |
| **Medio** | 50 | $100 | $250 | ~$203 |
| **Alto** | 100 | $120 | $600 | ~$553 |
| **Escala** | 500 | $150 | $3,750 | ~$3,703 |

> **Fees de plataforma descontados:** ~$46.50/mes (costos fijos estimados en escenario scaled).

---

## 4. Escenario con Exención de Comisiones (15 días)

### Supuestos:
- 15 días sin cobro de comisión al vendedor (la plataforma asume el 5%)
- Período promocional para atraer vendedores y listados
- Se mantienen los costos fijos operativos

### Costo de oportunidad:

| Escenario | Comisión no percibida (15 días) | Costos fijos (15 días) | Costo total |
|-----------|-------------------------------|------------------------|-------------|
| **Bajo** (10 tx/mes) | $20 | ~$23 | **$43** |
| **Medio** (50 tx/mes) | $125 | ~$23 | **$148** |
| **Alto** (100 tx/mes) | $300 | ~$23 | **$323** |

### Beneficios esperados:
1. **Adquisición de vendedores:** La exención atrae publicaciones sin fricción inicial.
2. **Masa crítica de listados:** Más productos = más compradores = efecto red.
3. **Conversión a ventas post-exención:** Vendedores que experimentan ventas durante la promoción tienen alta probabilidad de continuar.
4. **Marketing de boca en boca:** "Publica gratis 15 días en Turpial Market."

---

## 5. Recomendación Final

### ✅ **GO — Proceder con exención de 15 días** (con condiciones)

**Justificación:**
1. **Costo bajo y controlable:** El peor escenario (100 tx/mes) representa solo $323, equivalente a ~4-6 meses de costos fijos actuales.
2. **Retorno esperado positivo:** Si la promoción atrae 30+ vendedores nuevos que generan al menos 1 venta post-exención, el costo se recupera en 2-3 meses.
3. **Efecto red acelerado:** El marketplace necesita masa crítica de listados. La exención acelera este proceso sin inversión en ads.
4. **Bajo riesgo:** Si no funciona, el costo es mínimo y acotado a 15 días.

**Condiciones para el GO:**
1. Aplicar solo a **nuevos vendedores** (primera publicación).
2. Exención de **15 días corridos** desde la fecha de registro como seller.
3. Comunicar claramente: "Publica gratis 15 días. Después, comisión del 5% solo si vendes."
4. Medir: nuevos sellers, listings creados, ventas generadas, retención post-exención.

**Alternativa considerada (NO-GO):** No hacer exención y crecer orgánicamente. Más lento pero sin costo. No recomendado porque el marketplace está en fase temprana y necesita acelerar la adquisición de vendedores.

---

> **Documento generado para S-UX-02 — Mayo 2026.**
> Revisar y actualizar con datos reales de costos operativos al cierre del primer mes completo de operación.
