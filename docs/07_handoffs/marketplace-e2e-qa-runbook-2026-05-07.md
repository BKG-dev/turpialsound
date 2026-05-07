# Marketplace E2E QA Runbook (2026-05-07)

## 1) Objetivo

Ejecutar QA E2E manual, repetible y trazable del flujo marketplace buyer/seller/admin sin tocar produccion, sin tocar booking profundo, y sin confundir fallos de UI con fallos de DB/entorno.

## 2) Prerrequisitos

- Preview correcto del deployment a validar.
- DB integrada correcta para marketplace (tablas `mp_*` presentes).
- Usuario buyer disponible.
- Usuario seller disponible.
- Acceso admin disponible.
- Validar que NO se esta probando en produccion.
- Rama madre de referencia: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable de referencia: `c01ec60` (`fix(marketplace): render active listings on public page`).
- Regla de entorno: `DATABASE_URL` pooled/pooler y `DIRECT_URL` direct/no-pooler al mismo proyecto Neon.
- Principio central: Codigo correcto + DB incorrecta = UI vacia.

## 3) Sesiones separadas (obligatorio)

- Perfil A: buyer (navegador o perfil aislado A).
- Perfil B: seller (navegador o perfil aislado B).
- Perfil C: admin (navegador o perfil aislado C).
- No mezclar cookies/sesiones entre roles.

## 4) Checklist minimo de rutas

- `/marketplace`
- dashboard buyer/seller (si aplica)
- admin marketplace (si aplica)
- `/reservas` solo smoke de no-regresion (sin QA booking profundo)

## 5) Flujo E2E canonico marketplace

1. Seller tiene listing `ACTIVE`.
2. Buyer pregunta.
3. Seller responde.
4. Buyer inicia compra.
5. Buyer reporta pago.
6. Admin valida pago.
7. Estado pasa a `IN_ESCROW`.
8. Seller marca entregado.
9. No liberar fondos en este paso.
10. Buyer confirma recibido.
11. Estado pasa a `DELIVERY_CONFIRMED`.
12. Admin libera/cierra solo desde `DELIVERY_CONFIRMED`.

## 6) Matriz de severidad P0/P1/P2

### P0

- Admin puede liberar desde `IN_ESCROW`.
- Seller entrego libera fondos automaticamente.
- Buyer recibio pasa directo a `RELEASED` sin control admin esperado.
- Doble venta.
- Operacion nueva sin tasa si la implementacion la requiere.
- `/reservas` roto (regresion cruzada).

### P1

- Copy confuso en estados de dinero.
- CTA visible en estado incorrecto.
- Chat no refleja cambio de estado.

### P2

- Detalles visuales.
- Orden de columnas.
- Mensajes mejorables.

## 7) Formato de evidencia (por paso)

- Fecha/hora.
- Preview URL.
- Branch/commit.
- Usuario/rol.
- Listing usado.
- Transaction ID/codigo (si existe).
- Estado antes.
- Accion ejecutada.
- Estado despues.
- Captura opcional.
- Resultado `PASS` o `FAIL`.

Plantilla recomendada:

```text
[QA-EVIDENCE]
fecha_hora:
preview_url:
branch_commit:
rol_usuario:
listing:
transaction_id:
estado_antes:
accion:
estado_despues:
captura:
resultado:
```

## 8) Formato de reporte final para Jean

```text
[C1-MARKETPLACE-QA-HARNESS][REPORTE]

1. Rama:
2. Commit:
3. Push:
4. Archivos creados/modificados:
5. Contenido principal:
6. Validaciones:
   - git diff --check:
   - git diff --name-only:
   - git diff --stat:
   - git status -sb:
7. P0:
8. P1:
9. P2:
10. Stop conditions:
11. Siguiente recomendacion:
```

## 9) Datos que NO deben pegarse en ChatGPT

- Passwords.
- Tokens.
- Env vars completas.
- URLs con secretos.
- Datos bancarios privados.
- Cookies.
- Claves admin.

## 10) Arbol de diagnostico si marketplace sale vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs antes de tocar UI.
3. Buscar logs `marketplace.discovery`.
4. Clasificar: `DB_MISSING`, `QUERY_ERROR`, `ZERO_ACTIVE`, `FILTERED_EMPTY`.
5. Si aparece Prisma `P2021`, revisar DB target de inmediato.
6. Si faltan tablas `mp_*`, asumir probable DB incorrecta en Preview.
7. Validar fingerprint seguro de `DATABASE_URL`/`DIRECT_URL` (host hint, pooler true/false, sslmode), sin exponer secretos.
8. Corregir entorno Preview solo por Jean y redeployar mismo commit.
9. Solo revisar UI/filtros si DB y query estan correctas.