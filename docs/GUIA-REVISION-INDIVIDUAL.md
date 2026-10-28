# Guía para la revisión individual (criterio 10)

El docente pedirá que cada integrante **localice y explique** código. Esta guía indica dónde está cada cosa y qué decir.

| Si te preguntan por… | Abre | Qué explicar |
|---|---|---|
| **El flujo** | `docs/flujo-proceso.png` | Inicio (cliente pide visita) → validar datos → validar disponibilidad → *por confirmar* → confirmar / reprogramar / cancelar → *realizada* → casa *reservada* → fin. |
| **Trazabilidad** | `src/data/pantallas.ts` | Cada pantalla tiene un ID (P01…P11). El mismo ID aparece en el reporte, los bocetos, el mapa y aquí. El menú lateral se arma con `MENU`. |
| **Rutas y navegación** | `src/admin/main.tsx` | `HashRouter` + `Routes`. `Shell` es la ruta padre (encabezado + menú) y dentro se dibuja cada página con `<Outlet />`. |
| **Datos ficticios** | `src/data/demo.ts` y `src/admin/store.ts` | `demo.ts` guarda los datos de prueba; `store.ts` los copia con `structuredClone` y las pantallas se actualizan con `useStore()` + `rerender()`. |
| **Estado local / dinamismo** | `src/admin/pages/Appointments.tsx` | `setStatus()` cambia el estado de la cita; `NewAppointment` valida y crea la cita; `brokerClash()` evita choques de horario. |
| **Componentes reutilizables y props tipadas** | `src/admin/components/ui.tsx` | `PageHead({ title, sub, actions })`, `Metric`, `Tabs`, `Badge`, `FieldError`… cada uno con sus props tipadas en TypeScript. |
| **Formularios accesibles** | `NewAppointment` en `Appointments.tsx` | `<label htmlFor="nc-date">` + `<input id="nc-date">`; con error: `aria-invalid` y `aria-describedby` apuntan al mensaje (`FieldError`). |
| **Mensajes dinámicos** | `src/admin/components/Overlay.tsx` | El contenedor `#toasts` tiene `role="status" aria-live="polite"`: el lector de pantalla anuncia «Cita confirmada…». |
| **Estados de interfaz** | `Shell.tsx` (`LoadingView`), tablas (`table-empty`), `FieldError`, avisos | Carga simulada, vacío, error y éxito. |
| **Tailwind y sistema visual** | `src/admin/styles/theme.css` | `@theme` define los colores como clases de Tailwind (`bg-marino`, `text-texto-suave`, `border-borde`). |
| **Clases Tailwind en el JSX** | `Shell.tsx` | `lg:hidden` (botón de menú solo en celular), `hidden lg:inline-flex` (enlaces solo en escritorio), `grid grid-cols-2 lg:grid-cols-4 gap-4`, `animate-pulse` (esqueleto de carga). |
| **Mobile first** | final de `src/admin/styles/components.css` | Las reglas base son para 375 px; `@media (min-width: 48rem / 64rem / 80rem)` agregan columnas. Son los mismos cortes `md` / `lg` / `xl` de Tailwind. |
| **Datos sin servidor** | `src/admin/servicio.ts` y `src/lib/datos.ts` | No hay API: cada función devuelve una `Promise` con `setTimeout` (carga simulada) y datos de `src/data/`. El sitio guarda las solicitudes con `localStorage` y el panel las lee. En la Unidad 3 solo se cambia el interior de esas funciones por `fetch`. |
| **Roles y permisos** | `src/admin/auth.ts` (`can()`) | Lucía (propietaria) puede todo; Mariana (broker) registra pagos pero no los corrige ni anula. |

**Mejoras que pueden proponer:** conectar el servicio simulado con la API real en la Unidad 3; mostrar un calendario mensual; enviar recordatorios automáticos de las citas; y pruebas automáticas de accesibilidad con axe.
