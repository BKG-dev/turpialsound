# Resultado 1A.5 — Base de auth/roles interna

## Estado: COMPLETADA

---

## Qué se construyó y por qué

### Decisión de alcance

Una auth real productiva (login, manejo de sesiones, tokens JWT, provider OAuth) requería:
- instalar paquetes externos (`next-auth`, `jose`, o similar)
- crear flujo de login visual
- gestionar emisión y validación de tokens

Todo eso excede el alcance de 1A.5. En su lugar se dejó la **base estructural** que hace que la auth real de 1C pueda aterrizarse sin redefinir tipos ni contratos.

---

## Archivos creados

### `lib/auth/roles.ts`

Jerarquía de roles y helpers de permisos. Puro TypeScript, sin dependencias externas.

**Jerarquía definida (menor → mayor privilegio):**

| Rol | Peso |
|-----|------|
| `operations` | 1 |
| `casa_director` | 2 |
| `turpial_director` | 3 |
| `admin` | 4 |

**Helpers exportados:**

| Función | Qué evalúa |
|---------|-----------|
| `hasMinimumRole(userRole, requiredRole)` | Si el rol cumple o supera el requerido |
| `canAccessAdmin(userRole)` | Todos los roles internos (operations+) |
| `canReviewBookings(userRole)` | Puede ver y actualizar solicitudes (operations+) |
| `canApproveBookings(userRole)` | Puede emitir decisión de aprobación (casa_director+) |
| `canManageCatalog(userRole)` | Puede gestionar catálogos y usuarios (solo admin) |
| `INTERNAL_ROLES` | Lista ordenada de los 4 roles válidos |

Estos helpers se usan en Fase 1C para filtrar vistas del panel por rol y en los API Routes para autorizar acciones.

### `lib/auth/session.ts`

Contrato de sesión interna. Define el tipo `InternalSession` y la constante `SESSION_COOKIE_NAME`.

```typescript
interface InternalSession {
  userId: string
  email: string
  name: string
  role: UserRole
}

const SESSION_COOKIE_NAME = 'turpial_admin_session'
```

En Fase 1C, la lógica que crea y valida este tipo de sesión se implementa aquí o en un archivo adyacente (`lib/auth/token.ts` o similar), sin cambiar el contrato.

### `lib/auth/index.ts`

Barrel: re-exporta `roles.ts` y `session.ts`. El resto del proyecto importa desde `lib/auth`.

### `middleware.ts`

Protección mínima de rutas `/admin/:path*`.

Comportamiento actual:
- Si no existe la cookie `turpial_admin_session` → redirige a `/`
- Si existe → deja pasar (sin validar el contenido del token, que no existe aún)

En Fase 1C este bloque se reemplaza por validación real del token de sesión.

**Por qué no se importó desde `lib/auth/session.ts` en el middleware:**
Next.js middleware corre en Edge Runtime. Para evitar problemas de importación de módulos en edge, el nombre de la cookie se inlinea como literal en `middleware.ts`, con un comentario que lo vincula a `lib/auth/session.ts`. Ambos deben mantenerse sincronizados.

### `app/admin/page.tsx`

Placeholder estructural de la ruta `/admin`. No contiene formularios ni lógica. Confirma que la ruta existe y está protegida por middleware.

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `prisma.config.ts` — sin cambios
- `lib/bookings/` — sin cambios
- `types/bookings.ts` — sin cambios
- `package.json` — sin cambios (no se instalaron paquetes de auth)
- Todas las rutas públicas en `app/` excepto `app/admin/page.tsx`
- Todos los archivos de contenido, estilos y configuración global

---

## Relación con fases futuras

| Elemento | Cómo lo usa Fase 1C |
|----------|-------------------|
| `InternalSession` | Tipo de la sesión decodificada tras validar el token |
| `SESSION_COOKIE_NAME` | La cookie que 1C crea al hacer login y que middleware valida |
| `hasMinimumRole` | API Routes de aprobación verifican el rol antes de ejecutar |
| `canApproveBookings` | Panel oculta controles de aprobación si el rol no alcanza |
| `middleware.ts` | Se extiende con validación real del JWT / sesión cifrada |
| `app/admin/page.tsx` | Se convierte en el layout del panel con las secciones reales |

---

## Lo que queda pendiente para auth completa (Fase 1C)

| Pendiente | Descripción |
|-----------|------------|
| Login UI | Formulario de login para staff interno |
| Emisión de token/sesión | Crear `turpial_admin_session` con contenido cifrado/firmado |
| Validación en middleware | Leer y verificar el token antes de permitir acceso |
| Integración con `User` de Prisma | Consultar la DB para validar credenciales |
| `passwordHash` en User | El modelo User no tiene campo de contraseña todavía (depende del mecanismo de auth elegido) |
| Proveedor elegido | No se eligió todavía: `next-auth`, `lucia`, `jose` propio u otro |
| Logout | No existe mecanismo para invalidar sesión |

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | `middleware.ts` actualmente redirige a `/` siempre (no hay sesión real). El panel no es accesible hasta 1C. Correcto para esta fase. | 1C |
| 2 | `SESSION_COOKIE_NAME` está duplicado (inline en `middleware.ts` y como constante en `lib/auth/session.ts`). Deben mantenerse sincronizados. | 1C |
| 3 | El modelo `User` en schema no tiene `passwordHash`. Añadir este campo (o el mecanismo equivalente) depende del proveedor de auth que se elija en 1C. | 1C |
| 4 | No hay seed de usuarios internos. El seed de prueba de usuarios (con roles reales) se crea en 1C junto con el flujo de login. | 1C |
| 5 | Middleware solo protege `/admin`. Si en fases futuras se crean rutas de API internas (ej: `/api/admin/...`), el matcher debe extenderse. | 1C |

---

## Comandos a ejecutar fuera de Claude

```bash
# Verificar que TypeScript no reporta errores en lib/auth
pnpm build

# Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de Prisma en esta microtarea (no se tocó el schema ni el seed).
