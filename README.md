# Homiz · Panel administrativo de Inmobiliaria Zugar

**Actividad Sumativa 2 · Aplicaciones Web · LITIID41 · Unidad 2 Frontend**
**Equipo 6:** González Zurita Uriel Antonio · Khalil Martínez Claudia Samiha · Martínez Aguilar Santiago · Miam Santos Joshua Fernando

Prototipo frontend **navegable, responsivo y documentado** del panel administrativo de Homiz, el sistema de reservas y catálogo de propiedades de Inmobiliaria Zugar (Cancún), junto con su sitio público. **No se conecta a ninguna API ni servidor**: todo funciona con JavaScript, datos ficticios (`src/data/`) y estado local.

> 📄 El reporte completo de la actividad, con las partes 1 a 4, está en [`docs/REPORTE.md`](docs/REPORTE.md) y en PDF en [`docs/Reporte_Sumativa2_Equipo6.pdf`](docs/Reporte_Sumativa2_Equipo6.pdf).

---

## Problema

Las visitas a las casas se coordinaban por WhatsApp y llamadas. Por eso había citas que nadie confirmaba, brokers con dos visitas a la misma hora y casas que se ofrecían cuando ya estaban reservadas. El panel reúne en un solo lugar **la agenda de visitas y el inventario**, con estados claros para cada cita y cada casa.

## Flujo seleccionado: «Agendar y resolver una visita a una propiedad»

Solicitud de visita en el sitio público (llega a P10 Solicitudes) → validación de datos y de disponibilidad (casa publicable, broker libre) → cita **por confirmar** → el broker confirma, reprograma o cancela → visita **realizada** → si el cliente quiere la casa, pasa a **reservada** y después a **rentada** → cierre.

![Flujo del proceso](docs/flujo-proceso.png)

Las reglas de negocio que cambian la interfaz están en [`docs/REPORTE.md` (Parte 1, punto 4)](docs/REPORTE.md#4-reglas-de-negocio-que-cambian-lo-que-la-interfaz-muestra-o-permite).

## Lista de interfaces

El inventario vive en **[`src/data/pantallas.ts`](src/data/pantallas.ts)**. Cada pantalla tiene un ID que se repite igual en el reporte, en los bocetos, en el mapa y en el menú lateral del panel, que se arma con esa misma lista.

| ID | Interfaz | Ruta (`/admin/#…`) | Archivo | Usuario y objetivo |
|---|---|---|---|---|
| P01 | Inicio de sesión | `/login` | `src/admin/pages/Login.tsx` | Personal: entrar al panel |
| P02 | Resumen (dashboard) | `/resumen` | `src/admin/pages/Summary.tsx` | Administradora: supervisar la semana y sus pendientes |
| P03 | Listado de propiedades | `/propiedades` | `src/admin/pages/Properties.tsx` | Consultar el inventario y la disponibilidad |
| P04 | Detalle de propiedad | `/propiedades/:id` | `src/admin/pages/Properties.tsx` | Broker: revisar la casa, su próxima visita y su historial |
| P05 | Agenda de citas | `/citas` | `src/admin/pages/Appointments.tsx` | Broker: confirmar, reprogramar, cancelar o cerrar visitas |
| P06 | Nueva cita / Reprogramar | diálogo sobre `/citas` | `src/admin/pages/Appointments.tsx` | Registrar la solicitud de visita sin choques de horario |
| P07 | Formulario de propiedad | `/propiedades/nueva`, `/propiedades/:id/editar` | `src/admin/pages/PropertyForm.tsx` | Administración: alta de casas y cambio de estado (reservada) |
| P08 | Clientes e inquilinos | `/personas` | `src/admin/pages/People.tsx` | Expediente y próxima visita de cada persona |
| P09 | Brokers | `/brokers` | `src/admin/pages/Brokers.tsx` | Asignar el responsable de cada casa |
| P10 | Solicitudes | `/solicitudes` | `src/admin/pages/Requests.tsx` | Broker: atender lo que llega del sitio y agendar la visita |
| P11 | Pagos | `/pagos` | `src/admin/pages/Payments.tsx` | Administración: cobrar los pagarés de las rentas |

La tabla completa, con datos, acciones, conexiones y forma de regresar de cada pantalla, está en el reporte.

## Mapa de navegación

![Mapa de navegación](docs/mapa-navegacion.png)

## Capturas de los bocetos (baja fidelidad)

Bocetos clicables: abre [`docs/mockups/index.html`](docs/mockups/index.html) en el navegador.

| | |
|---|---|
| ![P01](docs/mockups/P01-inicio-sesion.png) | ![P02](docs/mockups/P02-resumen.png) |
| ![P03](docs/mockups/P03-propiedades.png) | ![P04](docs/mockups/P04-detalle-propiedad.png) |
| ![P05](docs/mockups/P05-agenda-citas.png) | ![P06](docs/mockups/P06-nueva-cita.png) |
| ![P07](docs/mockups/P07-formulario-propiedad.png) | ![P08](docs/mockups/P08-clientes.png) |
| ![P10](docs/mockups/P10-solicitudes.png) | |

## Capturas del prototipo

| 375 px · celular | 768 px · tableta | 1280 px · computadora |
|---|---|---|
| ![](docs/capturas/citas-375.png) | ![](docs/capturas/citas-768.png) | ![](docs/capturas/citas-1280.png) |
| ![](docs/capturas/resumen-375.png) | ![](docs/capturas/propiedades-768.png) | ![](docs/capturas/detalle-propiedad-1280.png) |
| ![](docs/capturas/solicitudes-375.png) | ![](docs/capturas/pagos-768.png) | ![](docs/capturas/solicitud-agendada-1280.png) |

Todas las capturas (login, menú móvil, carga, errores, éxito y cada pantalla en los 3 tamaños) están en [`docs/capturas/`](docs/capturas/).

## Tecnologías

- **React 19 + TypeScript** (modo estricto) y **React Router 8** (rutas con `#` en el panel)
- **HTML semántico**: `header`, `nav`, `main`, `aside`, `section`, `footer`, tablas y formularios con `label`
- **Tailwind CSS 4** con `@tailwindcss/vite`: tokens de diseño en `@theme`, componentes en `@layer components` y utilidades en el JSX
- **Vite 8** como servidor de desarrollo y empaquetador
- **Sin backend:** `src/admin/servicio.ts` (panel) y `src/lib/datos.ts` (sitio) simulan las respuestas con datos de `src/data/`, `setTimeout` y `localStorage`

## Sistema visual

| | |
|---|---|
| Paleta | Marino `#0B2A5B` (encabezado y títulos), Azul `#1F5BDB` (acciones), Fondo `#F4F7FB`, Borde `#DCE3ED`, Dorado `#E0B84A` (acentos). Estados: ok, aviso, error y gris, todos con contraste AA |
| Tipografía | Lora (títulos) + Inter (texto) |
| Espaciado | Escala de 4 px (`--esp-1` … `--esp-10`) |
| Bordes | Radios de 6 / 8 / 12 px; pastillas de 999 px |
| Controles | Altura mínima de 44 px, que se puede tocar con el dedo |
| Archivos | `src/admin/styles/theme.css` (tokens), `base.css`, `components.css` (componentes + **responsivo mobile first** al final) |

## Estructura del proyecto

```
├── docs/
│   ├── REPORTE.md                 ← reporte de la actividad (partes 1-4)
│   ├── flujo-proceso.png          ← diagrama del flujo
│   ├── mapa-navegacion.png        ← mapa de navegación (también .svg)
│   ├── mockups/                   ← bocetos: index.html clicable + un PNG por pantalla
│   ├── capturas/                  ← prototipo en 375, 768 y 1280 px
│   └── fuentes/                   ← archivos editables de los diagramas
├── admin/index.html               ← entrada del panel administrativo
├── index.html                     ← entrada del sitio público
├── public/assets/img/             ← logotipos y fotos
├── src/
│   ├── admin/
│   │   ├── main.tsx               ← rutas del panel (React Router)
│   │   ├── pages/                 ← una página por interfaz (P01-P11)
│   │   ├── components/            ← Shell (encabezado + menú), ui.tsx, Overlay (diálogos y avisos)
│   │   ├── styles/                ← tema Tailwind, base y componentes
│   │   ├── store.ts               ← estado del panel (lee src/data/demo.ts)
│   │   ├── auth.ts                ← sesión y permisos por rol (cuentas de demostración)
│   │   └── servicio.ts            ← servicio de datos simulado: solicitudes, pagos, expediente, avisos
│   ├── data/
│   │   ├── demo.ts                ← datos ficticios del panel: casas, personas, citas, solicitudes, pagarés…
│   │   ├── casas.ts               ← catálogo ficticio del sitio público
│   │   ├── zonas.ts               ← zonas de Cancún para el buscador del mapa
│   │   └── pantallas.ts           ← inventario de interfaces (IDs, rutas, conexiones)
│   ├── pages/ · components/ · lib/ ← sitio público (catálogo, detalle, contacto); lib/datos.ts guarda las solicitudes
│   └── main.tsx                   ← rutas del sitio público
├── package.json
└── vite.config.ts
```

## Instalación y ejecución

Requisitos: **Node.js 20.19+ o 22.12+** y npm.

```bash
git clone https://github.com/USUARIO/REPOSITORIO.git
cd REPOSITORIO
npm install
npm run dev
```

- Panel administrativo: **http://localhost:5500/admin/**
- Usuario de demostración: **`lucia@zugar.example`** · contraseña **`Zugar2026!`**
- Sitio público: http://localhost:5500/

No hace falta ningún servidor, base de datos ni archivo `.env`. Los cambios del panel viven en memoria y se reinician al recargar. Las solicitudes que se envían desde el sitio público se guardan en el navegador (`localStorage`) y aparecen en el panel, en **Solicitudes**, si se abre en el mismo navegador.

Otra cuenta de demostración, con permisos de broker: **`mariana@zugar.example`** · **`Zugar2026!`**.

Otros comandos: `npm run build` (revisa los tipos y genera `dist/`) · `npm run preview` · `npm run typecheck`.

### Recorrido sugerido para la revisión

1. En el **sitio público** abre una casa (por ejemplo, Casa Ceiba) y envía la solicitud de visita del formulario.
2. Entra al panel con el usuario de demostración (P01). Antes, prueba enviar el formulario vacío.
3. En **Solicitudes** (P10) aparece tu solicitud como **Nueva**. Ábrela y pulsa «Agendar cita»: la cita aparece en Citas como «por confirmar».
4. En **Resumen** (P02), haz clic en «Revisar» en «Una visita pendiente de confirmación» y llegarás a P05.
5. En **Citas** (P05), pulsa «Nueva cita» (P06). Intenta guardarla vacía y luego elige a Laura Medina, Casa Nativa, 24 oct a las 10:00. Aparece el **choque de horario**. Cambia a las 16:00 y guarda.
6. **Confirma** la cita y después **márcala como realizada**. Los avisos se anuncian con `aria-live`.
7. Abre la casa (P04), pulsa **Editar propiedad** (P07) y cambia el estado a **Reservada**.
8. En **Pagos** (P11) registra el pago del pagaré vencido de Casa Olivo.
9. Reduce la ventana a 375 px y usa el botón **☰ Menú**.
