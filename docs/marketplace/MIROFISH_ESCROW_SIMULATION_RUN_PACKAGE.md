# Turpial Marketplace — MiroFish Simulation Run Package

> **Paquete compacto para pegar en MiroFish. Listo para ejecutar.**  
> Fecha: 2026-05-24 | Rama: `docs/mirofish-escrow-simulation-seed-2026-05-24` @ `9b3aefb`  
> Documento fuente: [[MIROFISH_ESCROW_SIMULATION_SEED]]

---

## 1. Resumen ejecutivo

Turpial Marketplace opera en Venezuela con pago manual (Pago Movil, transferencia, Binance/USDT). No tiene pasarelas automaticas integradas. Cobra 5% de comision. El equipo es de 1-2 personas.

Esta simulacion compara **4 modelos de pago protegido** bajo **3 escenarios de crecimiento** (conservador, base, agresivo) a **12 meses** para responder:

**¿Que modelo de proteccion de pagos maximiza confianza, minimiza fraude y es operativamente sostenible?**

---

## 2. Los 4 escenarios

### ESCENARIO A — Sin escrow / Pago directo

Comprador paga directo al vendedor. Turpial no interviene en la transaccion. Solo conecta.

| Ventaja | Riesgo |
|---|---|
| Cero carga operativa | Fraude masivo, cero proteccion, abandono |
| Liquidez inmediata vendedor | Fuga a venta directa sin comision |
| Cero riesgo legal custodia | Reputacion negativa |

### ESCENARIO B — Escrow manual total (modelo actual)

Cada operacion: comprador paga → admin valida pago → escrow → vendedor entrega → comprador confirma → admin libera → admin paga al vendedor. **100% manual.**

| Ventaja | Riesgo |
|---|---|
| Maxima proteccion comprador | Cuello de botella operativo |
| Trazabilidad total | Vendedores quejan de liquidez lenta |
| Control de fraude | **Inviable >200 ops/mes** |

### ESCENARIO C — Pago Protegido hibrido por riesgo

Proteccion escalonada segun perfil de riesgo:

| Riesgo | Condiciones | Mecanismo |
|---|---|---|
| **Bajo** | Comprador recurrente + vendedor reputado + monto <$150 | Liberacion semi-auto (72h sin reclamo) |
| **Medio** | Comprador/vendedor nuevo o monto $150–$500 | Escrow manual (admin valida + comprador confirma) |
| **Alto** | Ambos nuevos, monto >$500, o historial de disputas | Escrow manual + revision adicional |

| Ventaja | Riesgo |
|---|---|
| Balance proteccion/fluidez | Scoring imperfecto |
| Admin enfoca tiempo en casos de riesgo | Falsos negativos (fraude en bajo riesgo) |
| Escala a ~500-1000 ops/mes | Vendedores manipulando scoring |

### ESCENARIO D — Compra Protegida automatizada

Pagos integrados automaticamente (Mercantil/Binance). Proteccion activa por default. Liberacion automatica al vendedor a N dias.

| Ventaja | Riesgo |
|---|---|
| Cero friccion manual | Dependencia de pasarelas externas |
| Escalabilidad masiva (+10k ops/mes) | Compliance complejo |
| Confianza institucional | Fraude sofisticado (chargebacks) |

---

## 3. Casos y supuestos

### CONSERVADOR

| Variable | Valor |
|---|---|
| Ops/mes inicial | 50 |
| Ticket promedio | $100 |
| Crecimiento mensual | 5% |
| Tasa disputa | 3% |
| Fraude comprador | 1% |
| Fraude vendedor | 1% |
| Fuga venta directa | 10% |
| Capacidad operativa | 20 ops/dia |
| Costo operativo/op | $2 |
| Costo soporte/disputa | $10 |
| Comision Turpial | 5% |

### BASE

| Variable | Valor |
|---|---|
| Ops/mes inicial | 150 |
| Ticket promedio | $150 |
| Crecimiento mensual | 10% |
| Tasa disputa | 5% |
| Fraude comprador | 1.5% |
| Fraude vendedor | 2% |
| Fuga venta directa | 15% |
| Capacidad operativa | 30 ops/dia |
| Costo operativo/op | $2 |
| Costo soporte/disputa | $10 |
| Comision Turpial | 5% |

### AGRESIVO

| Variable | Valor |
|---|---|
| Ops/mes inicial | 500 |
| Ticket promedio | $200 |
| Crecimiento mensual | 20% |
| Tasa disputa | 7% |
| Fraude comprador | 2% |
| Fraude vendedor | 3% |
| Fuga venta directa | 20% |
| Capacidad operativa | 40 ops/dia |
| Costo operativo/op | $2 |
| Costo soporte/disputa | $10 |
| Comision Turpial | 5% |

### Variables fijas (todos los casos)

| Variable | Valor |
|---|---|
| Comision Turpial | 5% (paga vendedor) |
| Escrow hold | T+7 dias |
| Equipo operativo | 1-2 personas |
| Pagos automaticos | Ninguno (Mercantil/Binance no integrados) |

---

## 4. Metricas que debe devolver MiroFish

Para cada combinacion **(Escenario A/B/C/D) x (Caso conservador/base/agresivo)**, devolver:

| # | Metrica | Unidad |
|---|---|---|
| 1 | **GMV mensual** (proyectado a 12 meses) | USD/mes |
| 2 | **Revenue Turpial** (GMV x 5%) | USD/mes |
| 3 | **Costo operativo mensual** (validaciones + liberaciones + disputas) | USD/mes |
| 4 | **Margen neto** (Revenue — Costo operativo) | USD/mes |
| 5 | **Horas admin/dia** necesarias para no acumular backlog | horas/dia |
| 6 | **Disputas activas mensuales** | #/mes |
| 7 | **Fraude no detectado** (perdidas por fraude) | USD/mes |
| 8 | **Tasa de fuga** a venta directa (perdida de GMV) | % |
| 9 | **Satisfaccion comprador** (NPS estimado) | -100 a +100 |
| 10 | **Satisfaccion vendedor** (NPS estimado) | -100 a +100 |
| 11 | **Riesgo legal/compliance** (bajo/medio/alto/critico) | cualitativo |
| 12 | **Punto de quiebre operativo** (volumen donde el modelo se rompe) | ops/mes |

---

## 5. Prompt final para pegar en MiroFish

```
===== COPIAR DESDE AQUI =====

Simula Turpial Marketplace, un marketplace peer-to-peer en Venezuela para
instrumentos musicales, audio y productos relacionados. Opera con pago manual
(Pago Movil, transferencia, Binance/USDT). Cobra 5% de comision. Equipo: 1-2
personas. Escrow T+7. Sin pasarelas automaticas integradas.

AGENTES: compradores nuevos/recurrentes/fraudulentos, vendedores
nuevos/reputados/con urgencia de liquidez/fraudulentos, admin Turpial,
soporte Turpial, MercadoLibre (competidor formal), WhatsApp/Instagram/Facebook
(competidor informal, venta directa), comunidad musical local.

ESCENARIOS A COMPARAR:
A. Sin escrow — comprador paga directo al vendedor, Turpial no interviene
B. Escrow manual total — admin valida cada pago, confirma cada entrega, libera
   cada fondo. 100% manual. (ES EL MODELO ACTUAL)
C. Pago Protegido hibrido por riesgo:
   - Riesgo BAJO (comprador recurrente + vendedor reputado + monto <$150):
     liberacion semi-auto 72h sin reclamo. Admin no interviene.
   - Riesgo MEDIO (comprador/vendedor nuevo o monto $150-$500):
     escrow manual. Admin valida pago, comprador confirma, admin libera.
   - Riesgo ALTO (ambos nuevos, >$500, o historial de disputas):
     escrow manual + revision adicional.
D. Compra Protegida automatizada — pasarelas integradas, proteccion automatica,
   liberacion automatica a N dias. (Requiere integracion Mercantil/Binance)

VARIABLES POR CASO:

CONSERVADOR: 50 ops/mes inicial, ticket $100, crec 5%/mes, disputa 3%,
fraude comprador 1%, fraude vendedor 1%, fuga directa 10%, cap operativa
20 ops/dia, costo op $2, costo disputa $10, comision 5%.

BASE: 150 ops/mes inicial, ticket $150, crec 10%/mes, disputa 5%,
fraude comprador 1.5%, fraude vendedor 2%, fuga directa 15%, cap operativa
30 ops/dia, costo op $2, costo disputa $10, comision 5%.

AGRESIVO: 500 ops/mes inicial, ticket $200, crec 20%/mes, disputa 7%,
fraude comprador 2%, fraude vendedor 3%, fuga directa 20%, cap operativa
40 ops/dia, costo op $2, costo disputa $10, comision 5%.

HORIZONTE: 12 meses desde el mes 1.

PARA CADA COMBINACION (escenario x caso) DEVUELVE:

1. GMV mensual a 12 meses (USD)
2. Revenue Turpial mensual (GMV x 5%, USD)
3. Costo operativo mensual (validaciones + liberaciones + disputas, USD)
4. Margen neto mensual (Revenue - Costo, USD)
5. Horas admin/dia necesarias (asume 5 min/validacion, 3 min/liberacion,
   20 min/disputa)
6. Disputas activas mensuales (#)
7. Fraude no detectado (USD/mes)
8. Tasa de fuga a venta directa (% de GMV perdido)
9. Satisfaccion comprador (NPS -100 a +100)
10. Satisfaccion vendedor (NPS -100 a +100)
11. Riesgo legal/compliance (bajo/medio/alto/critico)
12. Punto de quiebre: volumen de ops/mes donde el modelo colapsa y por que

FORMATO: tabla comparativa con los 4 escenarios en columnas y los 3 casos
como secciones. Al final, ranking de escenarios por caso.

===== FIN DEL PROMPT =====
```

---

## 6. Preguntas de decision

Tras la simulacion, responder:

| # | Pregunta |
|---|---|
| 1 | ¿Que modelo conviene para los **primeros 12 meses** en cada caso? |
| 2 | ¿A que volumen (ops/mes) el escrow manual total se vuelve **inviable**? |
| 3 | ¿A que volumen conviene **pasar de escrow manual (B) a hibrido (C)**? |
| 4 | ¿Que **reglas de riesgo** activan revision manual obligatoria en el modelo C? |
| 5 | ¿Que volumen obliga a **automatizar pagos** (pasar de C a D)? |
| 6 | ¿Que **datos minimos** deben persistirse en DB para trazabilidad, scoring y compliance? |
| 7 | ¿Como afecta la **volatilidad BCV/Binance** a cada escenario? |
| 8 | ¿Que hacer con operaciones de **bajo riesgo que fallan** (falsos negativos)? |
| 9 | ¿Cual es la estrategia de **transicion** recomendada? B → C → D, o saltar etapas? |

---

## 7. Como interpretar los resultados

1. **La simulacion no es verdad absoluta.** Es un modelo con supuestos. Sirve para identificar tendencias, cuellos de botella y puntos de quiebre, no para predecir el futuro exacto.

2. **Foco en el punto de quiebre operativo.** La metrica mas importante es: ¿a que volumen de ops/mes el modelo actual (B) se rompe? Ese numero define el calendario de decisiones.

3. **El modelo C es transicional.** No es un destino final. Sirve para el periodo entre "ya no da el escrow manual" y "todavia no justifica integrar pasarelas automaticas".

4. **Disputas y fraude son multiplicadores de costo.** Una operacion fraudulenta no solo pierde el GMV: consume tiempo de soporte, genera disputa, dana reputacion. El costo real es 3-5x el monto de la operacion.

5. **La fuga a venta directa es silenciosa.** No se ve en el dashboard. Si la friccion del escrow manual es muy alta, los usuarios migran a WhatsApp/Instagram y la plataforma pierde el GMV sin saberlo.

6. **Usa los resultados para disenar:**

   | Politica | Basado en metrica |
   |---|---|
   | Scoring de riesgo (modelo C) | Disputas + fraude por perfil de usuario |
   | Reglas de payout | Tiempo de cierre + liquidez vendedor |
   | Reglas de disputa | Costo soporte por disputa + falsos positivos |
   | Contratacion de soporte | Horas admin/dia proyectadas |
   | Prioridad de integracion (Mercantil vs Binance) | Punto de quiebre operativo |

7. **No decidas solo por revenue.** Un escenario con mayor margen pero insatisfaccion de vendedores (fuga, mal NPS) es perdedor a mediano plazo. Pondera margen + NPS comprador + NPS vendedor.

---

*Documento generado: 2026-05-24. Listo para copiar el prompt (Seccion 5) y pegar en MiroFish.*
