# Turpial Marketplace — MiroFish Seed: Pago Protegido / Escrow / Compra Protegida

> Documento semilla para simulacion en MiroFish. Preparado: 2026-05-24.
> Rama base: `MADRE/v8-s-mp-08-csv-tasas-neto-drop-social-2026-05-19` @ `560845a`

---

## 1. Proposito de la simulacion

Comparar 4 modelos de pago protegido y liberacion de fondos aplicados a Turpial Marketplace, un marketplace de instrumentos musicales, audio y productos relacionados en Venezuela. La simulacion debe revelar cual modelo maximiza conversion, minimiza fraude y es operativamente sostenible para un equipo pequeño en un mercado de baja confianza.

---

## 2. Pregunta estrategica central

**¿Turpial debe usar escrow manual total, pago protegido hibrido por riesgo, pago directo o compra protegida simplificada?**

Variables criticas que determinan la respuesta:
- ¿Que modelo conviene para los primeros 12 meses de operacion?
- ¿En que momento el escrow manual total se vuelve inviable?
- ¿Que operaciones deben ir obligatoriamente por Pago Protegido?
- ¿Cuando conviene liberar fondos rapido y cuando bloquear para revision manual?
- ¿Que reglas de disputa minimizan el abuso sin saturar soporte?
- ¿Que datos deben persistirse en base de datos para trazabilidad y compliance?

---

## 3. Contexto del negocio

### 3.1 Que es Turpial Marketplace

- **Confirmado en repo/docs:** Marketplace peer-to-peer de instrumentos musicales, audio y productos relacionados. Separado estructuralmente del sistema de booking/reservas (estudio de grabacion y ensayo).
- **Confirmado en repo/docs:** Modelos/tablas con prefijo `Mp*` para aislamiento total del dominio booking (`prisma/schema.prisma` lineas 397-1021, `docs/marketplace/00_IMPLEMENTATION_SUMMARY.md` linea 5).
- **Confirmado en repo/docs:** Booking (`/reservas`) congelado como "zona sana", propiedad de Jean. Marketplace activo en produccion, propiedad de Manuel (`docs/obsidian-vault/ROADMAP_RESCATE.md` lineas 11, 49-50).

### 3.2 Caracteristicas del mercado

- Mercado venezolano de baja confianza: pagos informales (Pago Movil, transferencia, Binance/USDT), riesgo de estafa, necesidad de liquidez del vendedor.
- **Confirmado en repo/docs:** Pago manual asistido por servidor — no es pasarela automatica (`docs/marketplace/02_PAYMENT_ARCHITECTURE.md` lineas 9-12).
- **Confirmado en repo/docs:** Turpial no cobra via API bancaria, no confirma via webhook automatico, no almacena comprobantes en storage productivo (`docs/marketplace/02_PAYMENT_ARCHITECTURE.md` lineas 15-19).
- Competidores informales: WhatsApp, Instagram, Facebook, Telegram (ventas directas sin proteccion).
- Competidor formal: MercadoLibre/Mercado Pago (modelo maduro con proteccion integrada).

---

## 4. Modelo actual confirmado en repo/docs

### 4.1 Flujo real implementado (CONFIRMADO)

Fuentes: `actions/marketplace/transactions.ts`, `actions/marketplace/admin.ts`, `prisma/schema.prisma`, `docs/marketplace/02_PAYMENT_ARCHITECTURE.md`

```
Paso 1 — Iniciar compra       [comprador]   PENDING_PAYMENT
Paso 2 — Subir comprobante    [comprador]   PAYMENT_RECEIVED
Paso 3 — Validar pago         [admin]       IN_ESCROW (o PAYMENT_FAILED)
Paso 4 — Marcar entrega       [vendedor]    IN_ESCROW (no cambia estado)
Paso 5 — Confirmar recepcion  [comprador]   DELIVERY_CONFIRMED
Paso 6 — Liberar fondos       [admin]       RELEASED
Paso 7 — Registrar pago       [admin]       RELEASED + MpPayout creado
```

### 4.2 Reglas de proteccion activas (CONFIRMADO)

| Regla | Fuente |
|---|---|
| Admin NO puede liberar desde `IN_ESCROW`, solo desde `DELIVERY_CONFIRMED` | `actions/marketplace/transactions.ts:675-677` |
| `confirmDelivery()` NO hace auto-release a `RELEASED` | `actions/marketplace/transactions.ts:593-655` |
| `releaseEscrow()` solo libera desde `DELIVERY_CONFIRMED` | `actions/marketplace/transactions.ts:657-707` |
| Admin solo ve boton "Liberar fondos" cuando TX esta en `DELIVERY_CONFIRMED` | `docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md:64-68` |
| Disputas activas bloquean confirmacion y liberacion | `actions/marketplace/transactions.ts:618-621, 681-683` |
| Vendedor no puede marcar entrega dos veces (idempotencia por status history) | `actions/marketplace/transactions.ts:81-90` |
| Tasa de cambio congelada al crear la transaccion (BCV o Binance) | `prisma/schema.prisma:709-713`, `actions/marketplace/transactions.ts:287-329` |
| Escrow auto-release programado a T+7 dias (campo seteado, cron NO implementado) | `prisma/schema.prisma:724`, `actions/marketplace/transactions.ts:495` |

### 4.3 Comisiones (CONFIRMADO)

| Concepto | Valor | Fuente |
|---|---|---|
| Comision plataforma Turpial | **5%** del monto de venta (paga el vendedor) | `lib/marketplace/finance.ts:1`, `types/marketplace.ts:229` |
| Comision bancaria interbancaria (pagos en Bs) | **0.3%** sobre monto en Bs | `lib/marketplace/finance.ts:2` |
| Flat fee USDT (pagos USDT directo) | **0.06 USDT** | `lib/marketplace/finance.ts:3` |
| Comision referral DropSocial | **0.5%** de la venta al referidor | `actions/marketplace/referrals.ts:71` |
| Exencion SOCIO/SUPER | Sin comision de plataforma | `prisma/schema.prisma:386-387` |
| IVA | Parametrizable via env `MP_IVA_PERCENT` | `docs/obsidian-vault/00_CENTRAL_TURPIAL.md:2283` |

### 4.4 Metodos de pago (CONFIRMADO)

**Comprador paga con:** Pago Movil, transferencia bancaria, Zelle, Binance Pay / crypto wallet manual.

**Vendedor cobra via:** Pago Movil, transferencia bancaria, Zelle, crypto wallet (Binance USDT).

**Automatizado:** Ninguno actualmente. Todo es manual con comprobante.

**Diferido:** Mercantil (C2P, Pago Movil, Boton de Pago), Binance Pay automatico (`docs/marketplace/03_API_INTEGRATION_PLAN.md:30-45`, `docs/marketplace/02_PAYMENT_ARCHITECTURE.md:145-152`).

### 4.5 Estados de transaccion (CONFIRMADO)

`prisma/schema.prisma:322-342` — Enum `MpTransactionStatus` (11 estados):

```
INITIATED → PENDING_PAYMENT → PAYMENT_RECEIVED → VALIDATING → IN_ESCROW
                                                        ↓           ↓
                                                  PAYMENT_FAILED   DELIVERY_CONFIRMED
                                                                   ↓           ↓
                                                                 RELEASED    DISPUTED
                                                                              ↓
                                                                        RELEASED / REFUNDED
```

Estados terminales: `RELEASED`, `REFUNDED`, `CANCELLED`, `PAYMENT_FAILED`.

### 4.6 Disputas (CONFIRMADO)

- `openDispute()` operativo desde `IN_ESCROW` o `DELIVERY_CONFIRMED` (`actions/marketplace/transactions.ts:709-755`)
- `resolveDispute()` operativo, solo SUPER, resuelve a favor de comprador → `REFUNDED` o vendedor → `RELEASED` (`actions/marketplace/transactions.ts:758-818`)
- `MpDispute` con trazabilidad basica, sin subsistema de evidencia estructurada ni SLA automatico (`docs/marketplace/04_DISPUTES_&_SECURITY.md:59-67`)

---

## 5. Actores/agentes para MiroFish

| Agente | Descripcion | Comportamiento clave |
|---|---|---|
| **Comprador nuevo desconfiado** | Primera compra, no conoce la plataforma, miedo a estafa | Alta friccion al pagar, posible abandono si no ve proteccion |
| **Comprador recurrente** | Ya compro 1+ veces, confia en el proceso | Menor friccion, espera experiencia fluida |
| **Vendedor nuevo** | Primer listing, sin reputacion | Puede fallar en entrega, no conoce el flujo |
| **Vendedor reputado** | +10 ventas, buen rating, verificado | Confiable, espera payout rapido |
| **Vendedor con urgencia de liquidez** | Necesita el dinero rapido, presiona al comprador/admin | Puede intentar venta directa fuera de plataforma |
| **Comprador fraudulento** | Reporta pago falso, abre disputa falsa, no confirma recepcion | Busca producto sin pagar |
| **Vendedor fraudulento** | No entrega, entrega producto defectuoso/distinto | Busca cobrar sin entregar |
| **Admin Turpial** | Manuel/equipo, valida pagos, libera escrow, resuelve disputas | Cuello de botella operativo |
| **Soporte Turpial** | Atiende dudas, media en conflictos | Puede saturarse si hay muchas disputas |
| **Banco / Pago Movil** | Proveedor de pago, comprobantes manuales | No ofrece webhooks automaticos |
| **Binance / USDT** | Proveedor de pago crypto | Tasa P2P volatil, no integrado automaticamente |
| **Competidor MercadoLibre** | Marketplace maduro con Mercado Pago integrado | Referencia aspiracional de proteccion |
| **Competidor informal (WA/IG/FB/TG)** | Venta directa sin proteccion ni comision | Fuga de usuarios si la friccion es muy alta |
| **Regulador / compliance** | Normas de custodia de fondos de terceros, prevencion de lavado | Riesgo legal creciente con volumen |
| **Comunidad musical local** | Musicos, productores, ingenieros de audio | Red de confianza parcial preexistente |

---

## 6. Escenarios a simular

### ESCENARIO A — Sin escrow / Pago directo comprador-vendedor

**Descripcion:** Turpial solo conecta comprador y vendedor. El pago es directo entre ellos sin intervencion de la plataforma. Turpial cobra comision por fuera o no cobra.

| Dimension | Evaluacion |
|---|---|
| Ventajas | Cero carga operativa para admin. Liquidez inmediata para vendedor. Cero riesgo legal de custodia. |
| Riesgos | Fraude masivo. Cero proteccion al comprador. Reputacion negativa. Fuga a ventas directas (sin comision). |
| Friccion comprador | Baja al pagar, ALTISIMA si es estafado (abandona plataforma). |
| Friccion vendedor | Cero. |
| Carga operativa | Cero. |
| Riesgo legal/compliance | Bajo en custodia, medio en fraude no gestionado. |
| Escalabilidad | Alta en teoria, insostenible en practica por perdida de confianza. |
| Senales de fallo | Disputas sin resolver, reviews negativas, abandono masivo de compradores. |

### ESCENARIO B — Escrow manual total

**Descripcion:** Modelo actual de Turpial Marketplace. Toda operacion pasa por escrow. Admin valida cada pago, comprador confirma recepcion, admin libera. 100% manual.

| Dimension | Evaluacion |
|---|---|
| Ventajas | Maxima proteccion al comprador. Trazabilidad total. Control de fraude. Confianza. |
| Riesgos | Cuello de botella operativo. Admin se satura. Vendedores se quejan de liquidez lenta. |
| Friccion comprador | Media-alta (espera validacion admin), pero protegido. |
| Friccion vendedor | Alta (espera 2-7+ dias para cobrar). |
| Carga operativa | **ALTISIMA** — Admin valida cada pago, libera cada escrow, resuelve cada disputa. |
| Riesgo legal/compliance | Medio — custodia de fondos de terceros, necesidad de politicas claras. |
| Escalabilidad | Inviable mas alla de ~100-200 ops/mes. |
| Senales de fallo | Tiempo de validacion >24h, payout >7 dias, quejas de vendedores, admin quemado. |

### ESCENARIO C — Pago Protegido hibrido por riesgo

**Descripcion:** Modelo escalonado donde el nivel de proteccion depende del perfil de riesgo de la operacion.

| Nivel de riesgo | Condiciones | Mecanismo |
|---|---|---|
| **Bajo** | Comprador recurrente + vendedor reputado + monto < $150 | Liberacion semi-automatica: si comprador no reporta problema en 72h, se libera. |
| **Medio** | Comprador nuevo o vendedor nuevo o monto $150-$500 | Escrow manual actual: validacion admin + confirmacion comprador. |
| **Alto** | Comprador y vendedor nuevos, o monto > $500, o historial de disputas | Escrow manual + revision adicional + payout demorado. |

| Dimension | Evaluacion |
|---|---|
| Ventajas | Balance proteccion/fluidez. Admin enfoca tiempo en casos de riesgo. Vendedores buenos cobran rapido. |
| Riesgos | Scoring de riesgo imperfecto. Falsos negativos (fraude en riesgo bajo). Falsos positivos (vendedor bueno tratado como alto riesgo). |
| Friccion comprador | Baja en riesgo bajo, media en medio, alta en alto. |
| Friccion vendedor | Variable segun scoring. Incentiva buen comportamiento. |
| Carga operativa | **Media** — Admin solo interviene en riesgo medio/alto y disputas. |
| Riesgo legal/compliance | Medio — similar al escrow manual total pero con menos operaciones custodiadas. |
| Escalabilidad | Escala a 500-1000 ops/mes sin contratar mas personal. |
| Senales de fallo | Disputas en riesgo bajo, vendedores manipulando scoring, scoring demasiado conservador. |

### ESCENARIO D — Compra Protegida simplificada (estilo marketplace maduro)

**Descripcion:** Modelo aspiracional tipo MercadoLibre/Mercado Pago. Pagos integrados automaticamente. Proteccion activa por default con reglas simples. Liberacion automatica del vendedor a N dias si no hay reclamo.

| Dimension | Evaluacion |
|---|---|
| Ventajas | Fluidez total. Cero friccion operativa manual. Escalabilidad masiva. Confianza institucional. |
| Riesgos | Dependencia de pasarelas de pago externas (Mercantil, Binance). Costo de integracion. Compliance complejo. Fraude sofisticado. |
| Friccion comprador | Minima (pago integrado, proteccion automatica). |
| Friccion vendedor | Minima (cobro automatico en N dias). |
| Carga operativa | **Baja** — Solo disputas excepcionales. |
| Riesgo legal/compliance | **Alto** — Custodia de fondos masiva, obligaciones de compliance, prevencion de lavado, proteccion de datos. |
| Escalabilidad | +10,000 ops/mes sin problema operativo. |
| Senales de fallo | Fraude con tarjetas robadas, chargebacks, dependencia de un solo proveedor de pago. |

---

## 7. Variables numericas base

| Variable | Valor base supuesto | Nota |
|---|---|---|
| Ticket promedio bajo | $50 | Pedales, cables, accesorios |
| Ticket promedio medio | $150 | Microfonos, interfaces de audio |
| Ticket promedio alto | $500 | Guitarras, teclados, monitores |
| Ticket promedio premium | $1,500 | Instrumentos profesionales, consolas |
| Comision Turpial | **5%** | Confirmado en codigo |
| Costo operativo por operacion normal | $2 (supuesto) | Tiempo admin de validar pago + liberar |
| Costo de soporte por disputa | $10 (supuesto) | Tiempo de investigacion + resolucion |
| Tasa de disputa | 3-5% de transacciones (supuesto) | A validar con datos reales |
| Fraude comprador | 1-2% (supuesto) | Pago falso, no confirmacion, disputa falsa |
| Fraude vendedor | 1-3% (supuesto) | No entrega, producto defectuoso |
| Reclamos falsos | 1% (supuesto) | Buyer's remorse disfrazado de disputa |
| Tiempo de liberacion al vendedor (modelo actual) | 2-7 dias | Depende de velocidad de comprador + admin |
| Tiempo de respuesta soporte | 24-48h (supuesto) | Sin SLA formal actualmente |
| Abandono por friccion | 15-30% (supuesto) | Compradores que no completan por miedo/proceso |
| Tasa de recompra | 20-40% (supuesto) | Compradores recurrentes |
| Venta fuera de plataforma | 10-20% (supuesto) | Usuarios que migran a trato directo |
| Diferencias BCV/Binance | ~2-5% | Volatilidad diaria |
| Costo payout (envio de pago al vendedor) | $0-2 (supuesto) | Depende del metodo |
| Capacidad operativa del equipo | 20-40 operaciones/dia (supuesto) | Manuel + posible asistente |
| Volumen mensual esperado | **Pendiente de dato real** | A validar con Manuel |
| Ticket promedio real | **Pendiente de dato real** | A validar con Manuel |
| Paises/mercados iniciales | Venezuela (confirmado por contexto) | A validar expansion |

---

## 8. Estados operativos

### 8.1 Confirmados en codigo (`MpTransactionStatus`)

```
INITIATED          — Comprador selecciono metodo de pago
PENDING_PAYMENT    — Esperando comprobante de pago
PAYMENT_RECEIVED   — Comprobante recibido, en revision
VALIDATING         — Admin revisando pago manual
IN_ESCROW          — Fondos retenidos, esperando entrega
DELIVERY_CONFIRMED — Comprador confirmo recepcion
RELEASED           — Fondos liberados al vendedor
REFUNDED           — Fondos devueltos al comprador
DISPUTED           — Bajo disputa
PAYMENT_FAILED     — Pago rechazado
CANCELLED          — Transaccion cancelada
```

### 8.2 Estados para el vendedor (CONFIRMADO UX glossary)

| Estado interno | Etiqueta UX vendedor |
|---|---|
| `IN_ESCROW` | "en proceso / operacion aprobada" (`docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md:15`) |
| `RELEASED` | "listo para cobrar / liberado para cobro" (`docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md:9`) |

### 8.3 Estados para el comprador (CONFIRMADO UX glossary)

| Estado interno | Etiqueta UX comprador |
|---|---|
| `PAYMENT_RECEIVED` | "pago recibido / en revision" (`docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md:10`) |
| `IN_ESCROW` | "dinero protegido / pago protegido" (`docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md:7-9`) |
| `DELIVERY_CONFIRMED` | "entrega confirmada" (`docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md:11`) |

### 8.4 Estados para admin

| Vista | Estados visibles |
|---|---|
| Validaciones pendientes | `PAYMENT_RECEIVED`, `VALIDATING` |
| Escrow activo | `IN_ESCROW` |
| Escrow por expirar | `IN_ESCROW` con `escrowReleaseAt` <= now + 24h |
| Listos para liberar | `DELIVERY_CONFIRMED` |
| Pagos pendientes al vendedor | `RELEASED` sin `MpPayout` completado |
| Disputas | `DISPUTED` |

---

## 9. Riesgos criticos

| Riesgo | Gravedad | Mitigacion actual | Pendiente |
|---|---|---|---|
| Custodia de fondos de terceros | ALTA | Escrow en DB, admin libera manual | Politica legal, cuenta bancaria juridica, Binance empresa (`S-ADM-02` pendiente fisico) |
| Compliance / prevencion de lavado | ALTA | Ninguna formal | Necesario antes de escalar volumen |
| Contracargos / chargebacks | NULA hoy (pagos manuales) | No aplica | Cobra relevancia si se integran pasarelas |
| Pagos no coincidentes | MEDIA | Admin revisa comprobante vs referencia | Webhook automatico eliminaria este riesgo |
| Reclamos falsos | MEDIA | Disputa manual, admin resuelve | Sin heuristica automatica de deteccion |
| Vendedor que no entrega | ALTA | Escrow bloquea fondos, disputa | Cron T+7 auto-release NO implementado aun |
| Comprador que no confirma | MEDIA | Escrow hold T+7 dias | Cron T+7 auto-release NO implementado aun |
| Diferencia de tasas BCV/Binance | MEDIA | Tasa congelada al crear TX, multi-provider consensus | OK mientras haya fuentes confiables |
| Soporte saturado | ALTA | No hay SLA ni herramienta | Escalaria si volumen crece |
| Retencion excesiva de liquidez | ALTA para vendedores | 2-7+ dias de espera | Scoring de riesgo (Escenario C) mitigaria |
| Fuga a ventas directas fuera de plataforma | ALTA | Confianza y proteccion del escrow son el diferenciador | Monitorear tasa de fuga |
| Reputacion negativa | ALTA | Reviews, ratings, verificacion | Respuesta rapida a disputas visible |

---

## 10. Metricas de salida

| Metrica | Definicion | Datos actuales |
|---|---|---|
| Conversion comprador | % de compradores que completan la compra iniciada | Pendiente dato real |
| Activacion vendedor | % de vendedores registrados que publican listing | Pendiente dato real |
| GMV mensual | Volumen bruto de mercancia transada | Pendiente dato real |
| Revenue Turpial | GMV x 5% comision | Pendiente dato real |
| Margen despues de costo operativo | Revenue — costos operativos — disputas | Pendiente dato real |
| Tasa de disputa | % de transacciones con disputa | Supuesto 3-5% |
| Tasa de fraude confirmado | % de transacciones fraudulentas | Supuesto 1-3% |
| Carga de soporte | Horas/admin/mes dedicadas a soporte | Pendiente dato real |
| Tiempo de cierre | Dias desde compra hasta payout al vendedor | 2-7 dias (actual) |
| Satisfaccion comprador | Reviews positivas / total | Pendiente dato real |
| Satisfaccion vendedor | Valoracion del proceso de cobro | Pendiente dato real |
| Riesgo reputacional | Menciones negativas en redes / comunidad | Pendiente dato real |
| Escalabilidad | Ops/mes sostenibles sin aumentar equipo | Estimado ~100-200 en modelo actual (Escenario B) |

---

## 11. Preguntas que MiroFish debe responder

1. ¿Que modelo (A, B, C o D) conviene para los primeros 12 meses de Turpial Marketplace?
2. ¿Cuando se vuelve inviable el escrow manual total (Escenario B)? ¿A que volumen?
3. ¿Que operaciones deben ir obligatoriamente por Pago Protegido y cuales pueden ser pago directo?
4. ¿Cuando liberar fondos rapido (<48h) y cuando bloquear para revision manual obligatoria?
5. ¿Que reglas de disputa hacen falta para minimizar abuso sin saturar soporte?
6. ¿Que datos minimos deben guardarse en DB para trazabilidad y compliance?
7. ¿Que senales tempranas indican abuso, fraude o saturacion operativa?
8. ¿Que modelo se parece a MercadoLibre/Mercado Pago pero adaptado a Turpial pequeño?
9. ¿Cual es el punto de equilibrio donde automatizar (Escenario D) es viable economicamente?
10. ¿Como afecta la volatilidad BCV/Binance a cada escenario?
11. ¿Que estrategia de comunicacion (copy UX) maximiza confianza sin generar expectativas falsas?
12. ¿Vale la pena segmentar por categoria de producto (instrumentos caros vs accesorios baratos)?

---

## 12. Prompt final para MiroFish

```
===== COPIAR Y PEGAR EN MIROFISH =====

CONTEXTO:
Turpial Marketplace es un marketplace peer-to-peer en Venezuela para instrumentos
musicales, audio y productos relacionados. Opera con pago manual (Pago Movil,
transferencia, Binance/USDT) porque no hay pasarelas automaticas integradas aun.
La plataforma cobra 5% de comision + fees bancarias. El equipo operativo es
pequeno (1-2 personas).

AGENTES:
- Compradores (nuevos desconfiados, recurrentes, fraudulentos)
- Vendedores (nuevos, reputados, con urgencia de liquidez, fraudulentos)
- Admin Turpial (valida pagos, libera escrow, resuelve disputas)
- Soporte Turpial
- Competidor MercadoLibre/Mercado Pago (referencia madura)
- Competidor informal (WhatsApp/Instagram/Facebook, venta directa sin comision)
- Comunidad musical local (red de confianza parcial)

ESCENARIOS:
A. Sin escrow / pago directo comprador-vendedor
B. Escrow manual total (modelo actual implementado)
C. Pago Protegido hibrido por riesgo (scoring de comprador+vendedor+monto)
D. Compra Protegida simplificada automatizada (estilo MercadoLibre)

VARIABLES:
- Ticket promedio: $50 / $150 / $500 / $1500 USD
- Comision Turpial: 5% fija
- Costo operativo por operacion: ~$2 (tiempo admin)
- Costo soporte por disputa: ~$10
- Tasa de disputa: 3-5% estimada
- Fraude comprador: 1-2%, Fraude vendedor: 1-3%
- Tiempo liberacion actual: 2-7 dias
- Diferencias BCV/Binance: 2-5% volatilidad diaria
- Capacidad operativa: ~20-40 operaciones/dia (1-2 personas)
- Tasa de fuga a venta directa: 10-20% si friccion > umbral
- Retencion de liquidez: T+7 dias configurado (cron no implementado)

HORIZONTE:
12 meses, con proyeccion a 24 meses.

CASOS:
- Conservador: 50 ops/mes, ticket $100, crecimiento 5% mensual
- Base: 150 ops/mes, ticket $150, crecimiento 10% mensual
- Agresivo: 500 ops/mes, ticket $200, crecimiento 20% mensual

FORMATO DE SALIDA ESPERADO:
Para cada escenario (A, B, C, D) x cada caso (conservador, base, agresivo):
1. GMV mensual a 12 meses
2. Revenue Turpial (5% comision)
3. Costo operativo mensual (validacion + liberacion + disputas)
4. Margen neto
5. Tasa de disputa y fraude
6. Carga operativa (horas/admin/dia)
7. Tiempo promedio de cierre (compra a payout)
8. Tasa de abandono / fuga
9. Satisfaccion comprador y vendedor (NPS estimado)
10. Escalabilidad: ¿a que volumen se rompe?
11. Riesgo reputacional y legal

===== FIN PROMPT MIROFISH =====
```

---

## 13. Datos faltantes para Manuel

| # | Dato faltante | Prioridad |
|---|---|---|
| 1 | Volumen mensual esperado de transacciones (real o proyectado) | ALTA |
| 2 | Ticket promedio real (no supuesto) | ALTA |
| 3 | Capacidad operativa diaria real (cuantas validaciones + liberaciones puede hacer 1 persona/dia) | ALTA |
| 4 | Costo/hora del admin (para calcular costo operativo real) | MEDIA |
| 5 | Tasa de disputa real observada (si hay datos historicos) | ALTA |
| 6 | Metodos de payout activos para vendedores (cuales usa la mayoria) | MEDIA |
| 7 | Reglas legales/compliance a validar (Venezuela: custodia de fondos, prevencion de lavado, facturacion) | ALTA |
| 8 | Politica de plazos deseada (maximo de espera aceptable para vendedor y comprador) | MEDIA |
| 9 | Paises/mercados iniciales (Venezuela confirmado, ¿otros?) | MEDIA |
| 10 | Categorias de producto de mayor riesgo (las que generan mas disputas o fraudes) | MEDIA |
| 11 | Estado de cuenta bancaria juridica + Binance empresa (S-ADM-02) | ALTA |
| 12 | Estrategia de comunicacion: ¿que terminos usar con usuarios? ("Pago Protegido", "Compra Protegida", "Dinero Protegido") | BAJA |
| 13 | Prioridad de integracion: ¿Mercantil o Binance Pay primero? | MEDIA |
| 14 | Volumen de referral DropSocial y su impacto en el margen neto | BAJA |

---

## 14. Glosario UX (CONFIRMADO)

Fuente: `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`

| Termino interno | Termino UX para usuarios |
|---|---|
| `escrow` | "dinero protegido" / "pago protegido" / "operacion protegida" |
| `IN_ESCROW` | "en proceso" / "operacion aprobada" (vendedor) |
| `PAYMENT_RECEIVED` | "pago recibido" / "en revision" (comprador) |
| `DELIVERY_CONFIRMED` | "entrega confirmada" |
| `RELEASED` | "listo para cobrar" / "liberado para cobro" (vendedor) |
| `payout` | "cobro" / "pago al vendedor" |
| `platform fee` | "comision" / "cargo" |
| `release escrow` | "marcar listo para pago al vendedor" (admin) |
| `payouts ready` | "ventas listas" / "listo para pagar" (admin) |

---

*Documento generado: 2026-05-24. Rama: `docs/mirofish-escrow-simulation-seed-2026-05-24`. Basado en lectura completa de docs/, prisma/schema.prisma, actions/, lib/marketplace/ y handoffs. Fuentes citadas como CONFIRMADO o SUPUESTO.*
