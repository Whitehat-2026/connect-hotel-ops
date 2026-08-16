# Hotel Hub-Mariano

Tu prompt ya es muy detallado, pero puede mejorarse para que una IA generadora de código (Lovable, Cursor, Claude Code, v0, Bolt, etc.) entregue un resultado más consistente, implementable y cercano a producción. La clave es convertirlo en un brief técnico ejecutable, definir entregables obligatorios, arquitectura, criterios de aceptación y restricciones de implementación.

Aquí tienes una versión optimizada:

Edit

Prompt optimizado — App hotelera de comunicación interna (lista para generar código)

Actúa como un arquitecto de software senior y programador full‑stack especializado en hotelería de lujo y operaciones de Alimentos y Bebidas. Diseña y genera una aplicación web funcional lista para desplegar en Lovable Cloud + Supabase, con autenticación, persistencia de datos, seguridad por roles y un módulo estratégico ejecutivo.

La respuesta debe estar 100% en español y entregar código, estructura de proyecto, SQL y componentes funcionales, no solo descripciones.

Objetivo del producto

Construir una plataforma de comunicación interna y coordinación operativa para un hotel de lujo (150–300 habitaciones) con foco en A&B, integrando todas las áreas del hotel y sustituyendo canales no controlados (WhatsApp personal, correos externos, mensajes informales).

Prioridades:

Confidencialidad de la información.

Comunicación horizontal entre áreas.

Trazabilidad completa.

Operación móvil para personal de piso.

Experiencia visual premium acorde a hotel 5 estrellas.

Stack obligatorio

Frontend: TanStack Start + React + TypeScript.

Backend: Supabase.

Base de datos: PostgreSQL (Supabase).

Validación: Zod.

Estado y datos: TanStack Query.

Estilos: CSS semántico centralizado en src/styles.css.

Autenticación: Supabase Auth (email/contraseña + Google).

Despliegue: Compatible con Lovable Cloud.

No usar Firebase, NextAuth, Prisma ni servicios externos adicionales.

Configuración de autenticación

Implementa:

Login con email y contraseña.

Login con Google.

Registro con auto-confirmación de email habilitada.

Recuperación de contraseña.

Persistencia de sesión.

Cierre de sesión seguro.

Crear helper requireSupabaseAuth() para proteger server functions.

Modelo de datos obligatorio

Genera una migración SQL completa con:

Enum

app_role: admin, gerente, supervisor, colaborador.

Tablas

profiles

user_roles

areas

incidents

shift_handovers

announcements

announcement_reads

vip_alerts

checklists

checklist_items

internal_requests

Requisitos:

UUIDs.

created_at, updated_at.

Índices por área, estado y prioridad.

Foreign keys.

Triggers de actualización automática de updated_at.

Implementar función SQL:

has_role(_user_id uuid, _role app_role)


como SECURITY DEFINER.

Nunca almacenar roles en **profiles**.

Seguridad (obligatorio)

Implementar:

RLS activado en todas las tablas.

Políticas:

Colaborador: solo registros creados por él o dirigidos a su área.

Supervisor: registros de su área.

Gerente y admin: acceso total.

vip_alerts: solo gerente y admin.

GRANT explícitos por tabla.

Incluye el SQL completo de políticas y grants.

Datos semilla obligatorios

Insertar datos reales de ejemplo para:

Áreas.

Usuarios de ejemplo.

Comunicados.

Incidencias.

Entregas de turno.

Checklists.

Alertas VIP.

Pedidos internos.

Las pantallas deben verse pobladas desde el primer render.

Estructura de rutas

Genera el árbol exacto:

src/routes/
├── index.tsx
├── auth.tsx
└── _authenticated/
    ├── dashboard.tsx
    ├── incidencias.tsx
    ├── turnos.tsx
    ├── comunicados.tsx
    ├── vip.tsx
    ├── checklists.tsx
    ├── pedidos.tsx
    ├── estrategia.tsx
    └── admin.tsx


Todas las rutas autenticadas deben validar sesión.

Funcionalidad por pantalla

Dashboard

Mostrar tarjetas KPI:

Incidencias abiertas.

Tiempo medio de respuesta.

Checklists completados hoy.

VIPs del día.

Comunicados sin leer.

Agregar gráficos simples y lista de tareas pendientes.

Incidencias

CRUD completo:

Crear.

Asignar.

Cambiar prioridad.

Escalar.

Resolver.

Medir tiempo de respuesta automáticamente.

Filtros por área, estado, prioridad y fecha.

Turnos

Entrega digital con:

Pendientes.

VIPs.

Incidencias abiertas.

Firma de entrega.

Firma de recepción.

Comunicados

Globales o por área.

Confidencialidad: interno/restringido.

Confirmación de lectura obligatoria.

VIP

Tabla protegida con:

Huésped.

Habitación.

Preferencias.

Alergias.

Restricciones.

Áreas involucradas.

Checklists

SOPs por área y turno con checkboxes persistentes y responsable.

Pedidos

Flujo:

Crear solicitud.

Aprobar/rechazar.

En proceso.

Entregado.

Cerrado.

Admin

Gestión de:

Usuarios.

Roles.

Áreas.

Activación/desactivación de cuentas.

Módulo /estrategia

Generar un informe ejecutivo completo dentro de la aplicación con:

Resumen ejecutivo (máx. 10 líneas).

Matriz comparativa de Teams, Slack Enterprise Grid, Beekeeper, Staffbase, HotSOS y Quore.

Procesos operativos a rediseñar.

Integraciones PMS/ERP:

Opera Cloud.

Infor HMS.

SAP.

APIs REST.

HTNG.

Middleware.

Automatizaciones propuestas.

Controles de seguridad.

Plan de implementación de 90 días en 3 fases.

KPIs operativos.

Recomendación “mejor seguridad–operación–costo”.

Recomendación “mejor experiencia premium”.

Usar tablas comparativas profesionales.

Diseño UI/UX

Tema premium:

Fondo grafito profundo.

Acentos latón/dorado tenue.

Títulos serif elegantes.

Datos operativos en sans serif.

Alto contraste.

Optimizado para móvil.

Tablas densas para turnos rotativos.

Definir tokens CSS:

--bg-primary
--bg-secondary
--text-primary
--text-secondary
--accent-gold
--accent-gold-soft
--border-subtle
--success
--warning
--danger


No usar colores hardcodeados en componentes.

Componentes reutilizables obligatorios

Crear:

StatCard

DataTable

StatusBadge

PriorityBadge

AreaBadge

RoleBadge

PageHeader

EmptyState

ConfirmDialog

ProtectedRoute

Server Functions

Usar createServerFn para todas las operaciones de lectura y escritura.

Cada función debe:

Validar entrada con Zod.

Obtener usuario autenticado.

Ejecutarse bajo RLS del usuario.

Manejar errores tipados.

SEO y metadata

Cada ruta debe exportar:

export const head = () => ({
  title: '...',
  meta: [{ name: 'description', content: '...' }]
})


Entregables obligatorios

La respuesta debe incluir, en este orden:

Arquitectura general.

Árbol completo del proyecto.

Migración SQL completa.

Políticas RLS completas.

Datos semilla.

Helpers de autenticación.

Server functions principales.

Componentes reutilizables.

Código de las páginas principales.

src/styles.css.

Instrucciones de despliegue en Lovable Cloud.

Checklist de pruebas funcionales.

Riesgos y mejoras futuras.

No omitir código crítico.

Criterios de aceptación

La solución será válida solo si:

Compila en TypeScript sin errores.

Todas las tablas tienen RLS activo.

Existen datos visibles al iniciar.

Un colaborador no puede ver información de otra área.

Un supervisor solo ve su área.

Un gerente ve todas las áreas.

Un colaborador no puede acceder a /vip.

Los comunicados registran lectura.

Los checklists persisten estado.

Los pedidos siguen el flujo de aprobación.

El módulo /estrategia contiene todo el análisis solicitado.

Fuera de alcance (documentar, no implementar)

Integración real con Opera, Infor o SAP.

SSO corporativo.

MFA empresarial.

Notificaciones push.

Firma biométrica.

Integración telefónica PBX.

App móvil nativa.

Documenta estas capacidades en una sección “Roadmap fase 2”.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://connect-hotel-ops.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5dfccbdc-9786-48d6-88d9-0ea25f901ac3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
