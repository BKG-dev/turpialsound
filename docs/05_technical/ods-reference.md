# ODS — Referencia técnica completa

## Definición
El motor ODS es: **Workflow Engine + CRM ligero + Gestor documental + Sistema de agenda**
Implementado sobre Google Workspace como capa operativa inicial válida.

---

## Componentes heredados

### Google Sheets
- Hoja `ODS` — formulario activo
- Hoja `Motor` — base de clientes / autocompletado
- Hoja `RegistroODS` — historial maestro

### Apps Script
- UI operativa (menús, diálogos)
- Lógica de negocio
- API externa (`doGet` / `doPost`)
- Integraciones con Google

### Drive
- Almacenamiento documental
- Correlativos
- Trazabilidad

### Calendar
- Agenda operativa
- Detección de conflictos (futura)

### Gmail / MailApp
- Aprobaciones
- Notificaciones
- Disparadores humanos

---

## Flujo actual válido

1. Usuario llena formulario
2. Se validan datos
3. Se genera ID único
4. Se crea documento
5. Se envían correos
6. Se agenda evento
7. Se registra operación
8. Aprobador responde
9. Sistema actualiza estado

---

## Funciones heredadas conocidas

- `onOpen()`
- `gestionarEdicionCliente(e)`
- `agregarCliente(datos)`
- `iniciarProcesoDeAprobacion()`
- `obtenerCorrelativoDesdeDrive()`
- `generarIdODS()`
- `crearDocumentoODS()`
- `enviarCorreosAprobacion()`
- `crearEventoCalendario()`
- `limpiarFormulario()`
- `doPost(e)` / `doGet(e)`

---

## Limitaciones conocidas

- Seguridad básica
- UI limitada a Sheets
- Dependencia total de Google
- Control de concurrencia insuficiente
- Acoplamiento entre UI, lógica e integraciones
- Observabilidad escasa

---

## Arquitectura objetivo por capas

```
/UI Layer          — menús Sheets · diálogos · formularios · endpoints de entrada
/Application Layer — casos de uso · orquestación · reglas de flujo
/Domain Layer      — entidades · reglas de negocio · estados ODS · validaciones
/Infrastructure    — Sheets repo · Drive svc · Calendar svc · Mail svc · Web app handlers · logging
```

---

## Estados ODS

Mínimos activos: `PENDIENTE` · `APROBADA` · `DENEGADA`

Preparados para futuro: `BORRADOR` · `PROGRAMADA` · `EJECUTADA` · `CANCELADA` · `ARCHIVADA`

---

## Reglas de refactor

1. Preservar funcionalidad existente antes de reescribir
2. Documentar el sistema real antes de refactorizar
3. Refactorizar por capas (no big bang)
4. Separar dominio, servicios, repositorios e integraciones
5. Preparar contratos de API
6. Endurecer validaciones, logs y manejo de errores
7. Diseñar ruta de migración sin romper producción actual

---

## Test points ODS

- Creación de orden
- Correlativo correcto
- Generación documental
- Notificación correcta
- Creación de evento
- Transición de estados
- Registro histórico consistente
- Respuesta segura de endpoints
