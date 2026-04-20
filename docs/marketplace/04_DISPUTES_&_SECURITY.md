# DISPUTES & SECURITY

**Actualizado:** 2026-04-19
**Estado:** Parcialmente implementado y parcialmente planificado

---

## Panorama real

El marketplace ya tiene disputa y controles basicos funcionales, pero no esta en una fase final de hardening. Este documento separa claramente lo implementado de lo diferido.

---

## Implementado hoy

### Disputas

- `openDispute()` operativo
- `resolveDispute()` operativo
- UI de disputa en dashboard operativo
- `MpDispute` y `MpTransactionStatusHistory` dan trazabilidad basica

### Seguridad y control de acceso

- sesiones JWT para marketplace
- aislamiento del dominio `Mp*`
- control por rol en acciones admin
- validacion de pertenencia buyer/seller en chat y transacciones
- audit trail basico via historial de estados

### Estado de TypeScript

- `npx tsc --noEmit` limpio al momento de esta actualizacion

---

## Riesgos vigentes

### Media storage

- comprobantes e imagenes no deben seguir resolviendose con base64 en produccion
- falta una decision practica de storage productivo

### Hardening pendiente

- rate limiting amplio en endpoints sensibles
- estrategia final de cifrado para ciertos payloads sensibles
- politica formal de retencion y borrado
- alertas e incident response real

### Pagos

- el flujo sigue siendo manual
- no hay webhook productivo activo
- la validacion depende de operacion admin

---

## Protocolo operativo actual de disputa

1. La transaccion debe estar en `IN_ESCROW`.
2. Buyer o seller abre disputa desde el flujo habilitado.
3. La transaccion pasa a `DISPUTED`.
4. Admin revisa.
5. Admin resuelve a favor de buyer o seller.
6. El resultado termina en `REFUNDED` o `RELEASED`.

No hay todavia un subsistema completo de evidencias estructuradas ni SLA automatizado. Eso sigue pendiente.

---

## Implementar despues

- webhooks con verificacion de firma
- rate limiting por proveedor
- alertas operativas
- evidencias estructuradas para disputa
- politicas formales de auditoria y retencion
- cron de monitoreo y auto-release

---

## Criterio de documentacion

Las decisiones vivas de seguridad, incidentes y rescate deben registrarse primero en Obsidian y luego consolidarse aqui cuando cambien el estado tecnico real.
