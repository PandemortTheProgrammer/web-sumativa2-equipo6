/* ==========================================================================
   Inventario de interfaces del panel administrativo (Parte 2 de la actividad).
   Es la fuente única de la trazabilidad: cada pantalla tiene un ID (P01…P11)
   que se repite igual en el reporte, en los bocetos (docs/mockups/P01-….png),
   en el mapa de navegación (docs/mapa-navegacion.png) y aquí, en el código.
   El menú lateral del panel (src/admin/components/Shell.tsx) se arma con esta lista.
   ========================================================================== */

export type PantallaId = 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07' | 'P08' | 'P09' | 'P10' | 'P11';

export interface Pantalla {
  id: PantallaId;
  nombre: string;
  /** Ruta dentro del panel (/admin/#/…) */
  ruta: string;
  /** Archivo de React que la dibuja */
  archivo: string;
  /** principal = parte del flujo «Agendar y resolver una visita»; complementaria = apoyo al flujo */
  tipo: 'principal' | 'complementaria';
  usuario: string;
  objetivo: string;
  datos: string[];
  acciones: string[];
  /** A qué pantallas lleva (ida) */
  conecta: PantallaId[];
  /** Cómo se regresa */
  regreso: string;
  /** Paso del flujo del proceso que resuelve (docs/flujo-proceso.png) */
  pasoFlujo: string;
  /** Ícono y texto del menú lateral (solo las secciones del menú) */
  menu?: { icono: string; texto: string };
}

export const PANTALLAS: Pantalla[] = [
  {
    id: 'P01', nombre: 'Inicio de sesión', ruta: '/login', archivo: 'src/admin/pages/Login.tsx', tipo: 'principal',
    usuario: 'Personal (administración y brokers)', objetivo: 'Entrar al panel con su cuenta.',
    datos: ['Correo', 'Contraseña', 'Mensajes de error, bloqueo y sesión cerrada'],
    acciones: ['Entrar al panel', 'Mostrar u ocultar contraseña', 'Mantener la sesión iniciada'],
    conecta: ['P02'], regreso: '«Cerrar sesión» en el menú de usuario vuelve aquí.', pasoFlujo: 'Inicio · acceso del personal',
  },
  {
    id: 'P02', nombre: 'Resumen (dashboard)', ruta: '/resumen', archivo: 'src/admin/pages/Summary.tsx', tipo: 'principal',
    usuario: 'Administradora; supervisar la semana', objetivo: 'Ver indicadores y pendientes antes de actuar.',
    datos: ['Indicadores (propiedades, disponibles, clientes, citas)', 'Próximas visitas', 'Pendientes: citas por confirmar y borradores', 'Actividad reciente'],
    acciones: ['Ver agenda', 'Revisar cita por confirmar', 'Completar borrador', 'Nueva propiedad', 'Exportar resumen (CSV)'],
    conecta: ['P05', 'P04', 'P07', 'P03'], regreso: 'Logo «Zugar» o «Resumen» en el menú.', pasoFlujo: 'Detectar visitas pendientes',
    menu: { icono: 'grid', texto: 'Resumen' },
  },
  {
    id: 'P03', nombre: 'Listado de propiedades', ruta: '/propiedades', archivo: 'src/admin/pages/Properties.tsx', tipo: 'principal',
    usuario: 'Administración y brokers; consultar el inventario', objetivo: 'Encontrar una casa y saber si está disponible.',
    datos: ['Foto, nombre y clave', 'Operación y precio', 'Zona', 'Estado (disponible, reservada, rentada, borrador)', 'Broker responsable'],
    acciones: ['Filtrar por estado, operación, zona, broker y amenidades', 'Buscar', 'Ver detalle', 'Editar', 'Pausar o publicar', 'Eliminar (con confirmación)', 'Exportar CSV'],
    conecta: ['P04', 'P07'], regreso: 'Migas «Administración / Propiedades» y menú lateral.', pasoFlujo: 'Validar que la casa esté disponible',
    menu: { icono: 'home', texto: 'Propiedades' },
  },
  {
    id: 'P04', nombre: 'Detalle de propiedad', ruta: '/propiedades/:id', archivo: 'src/admin/pages/Properties.tsx (PropertyDetail)', tipo: 'principal',
    usuario: 'Broker; revisar la casa antes y después de la visita', objetivo: 'Ver datos, estado, próxima visita e historial de la casa.',
    datos: ['Galería', 'Precio y datos (recámaras, baños, m²)', 'Amenidades', 'Broker y contacto', 'Próxima visita', 'Historial de cambios'],
    acciones: ['Editar propiedad', 'Pausar o publicar', 'Ver la cita en la agenda', 'Pestañas Expediente y Pagos'],
    conecta: ['P07', 'P05', 'P03'], regreso: '«Volver al listado» y migas de pan.', pasoFlujo: 'Revisar datos de la casa',
  },
  {
    id: 'P05', nombre: 'Agenda de citas', ruta: '/citas', archivo: 'src/admin/pages/Appointments.tsx', tipo: 'principal',
    usuario: 'Broker; resolver las visitas de la semana', objetivo: 'Confirmar, reprogramar, cancelar o cerrar cada visita.',
    datos: ['Semana con citas por día', 'Indicadores por estado', 'Lista filtrable (cliente, casa, broker, estado)', 'Detalle de la cita seleccionada con nota del cliente'],
    acciones: ['Nueva cita', 'Confirmar cita', 'Reprogramar', 'Marcar como realizada', 'Cancelar (con confirmación)', 'Rentarle la casa (contrato y pagarés)', 'Cambiar de semana y día', 'Exportar agenda'],
    conecta: ['P06', 'P04', 'P08'], regreso: 'Menú lateral «Citas»; las migas regresan al resumen.', pasoFlujo: 'Revisión del broker → confirmar / reprogramar / cancelar → realizada',
    menu: { icono: 'cal', texto: 'Citas' },
  },
  {
    id: 'P06', nombre: 'Nueva cita / Reprogramar (diálogo)', ruta: '/citas?nueva=… (ventana sobre P05)', archivo: 'src/admin/pages/Appointments.tsx (NewAppointment, Reschedule)', tipo: 'principal',
    usuario: 'Broker o administración; registrar la solicitud de visita', objetivo: 'Agendar una visita válida sin choques de horario.',
    datos: ['Cliente', 'Propiedad (sin borradores)', 'Fecha (desde hoy)', 'Horario', 'Broker responsable', 'Nota del cliente'],
    acciones: ['Agendar cita', 'Guardar nuevo horario', 'Cancelar (cierra con Esc)'],
    conecta: ['P05'], regreso: 'Al guardar o cancelar vuelve a P05 con la cita seleccionada.', pasoFlujo: 'Solicitud recibida → validación de datos y disponibilidad',
  },
  {
    id: 'P07', nombre: 'Formulario de propiedad', ruta: '/propiedades/nueva · /propiedades/:id/editar', archivo: 'src/admin/pages/PropertyForm.tsx', tipo: 'principal',
    usuario: 'Administración; dar de alta o actualizar una casa', objetivo: 'Registrar datos, fotos y el estado de la casa (reservada, rentada…).',
    datos: ['01 Datos generales', '02 Operación y disponibilidad (estado)', '03 Fotos', '04 Amenidades', 'Resumen y lista de requisitos para publicar'],
    acciones: ['Guardar cambios / Crear y publicar', 'Cambiar estado a reservada o rentada', 'Agregar y ordenar fotos', 'Cancelar'],
    conecta: ['P04', 'P03'], regreso: '«Cancelar» o migas regresan al detalle o al listado.', pasoFlujo: 'Actualizar el estado de la casa (cierre)',
  },
  {
    id: 'P08', nombre: 'Clientes e inquilinos', ruta: '/personas', archivo: 'src/admin/pages/People.tsx', tipo: 'complementaria',
    usuario: 'Broker; conocer a quién atiende', objetivo: 'Consultar el expediente y la próxima visita de cada persona.',
    datos: ['Directorio con seguimiento', 'Expediente: contacto, presupuesto, necesidades', 'Próxima visita'],
    acciones: ['Filtrar y buscar', 'Agregar o editar persona', 'Agendar visita para la persona', 'Eliminar (con confirmación)'],
    conecta: ['P06', 'P05'], regreso: 'Menú lateral.', pasoFlujo: 'Datos del cliente para la cita',
    menu: { icono: 'users', texto: 'Clientes e inquilinos' },
  },
  {
    id: 'P09', nombre: 'Brokers', ruta: '/brokers', archivo: 'src/admin/pages/Brokers.tsx', tipo: 'complementaria',
    usuario: 'Administración; repartir el trabajo', objetivo: 'Asignar el broker responsable de cada casa.',
    datos: ['Tarjetas de brokers con casas y próximas citas', 'Asignación por propiedad'],
    acciones: ['Asignar responsable', 'Agregar o editar broker', 'Activar o desactivar'],
    conecta: ['P04'], regreso: 'Menú lateral.', pasoFlujo: 'Definir quién atiende la visita',
    menu: { icono: 'user-key', texto: 'Brokers' },
  },
  {
    id: 'P10', nombre: 'Solicitudes', ruta: '/solicitudes', archivo: 'src/admin/pages/Requests.tsx', tipo: 'principal',
    usuario: 'Broker; atender lo que llega del sitio público', objetivo: 'Responder, proponer casas y convertir la solicitud en cita.',
    datos: ['Solicitudes nuevas, en seguimiento y cerradas', 'Formulario que llenó la persona', 'Citas y casas propuestas', 'Mensajes'],
    acciones: ['Agendar cita', 'Proponer casas', 'Enviar mensaje', 'Nueva solicitud', 'Cambiar seguimiento'],
    conecta: ['P05', 'P04'], regreso: 'Menú lateral; las citas enlazan a P05.', pasoFlujo: 'Solicitud recibida (sitio público) → agendar la visita',
    menu: { icono: 'mail', texto: 'Solicitudes' },
  },
  {
    id: 'P11', nombre: 'Pagos', ruta: '/pagos', archivo: 'src/admin/pages/Payments.tsx', tipo: 'complementaria',
    usuario: 'Administración; cobrar rentas', objetivo: 'Registrar pagarés y pagos de contratos.',
    datos: ['Pagarés vencidos, por cobrar y pagados', 'Casa, inquilino, vencimiento y monto'],
    acciones: ['Registrar pago', 'Corregir o anular pago', 'Editar o cancelar pagaré', 'Subir PDF'],
    conecta: ['P04'], regreso: 'Menú lateral; el nombre de la casa lleva a P04.', pasoFlujo: 'Después del cierre: cobrar la renta del contrato',
    menu: { icono: 'cash', texto: 'Pagos' },
  },
];

/** Orden del menú lateral */
const ORDEN_MENU: PantallaId[] = ['P02', 'P03', 'P08', 'P09', 'P05', 'P10', 'P11'];

/** Secciones del menú lateral: [ruta sin «/», ícono, texto] */
export const MENU = ORDEN_MENU.map((id) => PANTALLAS.find((p) => p.id === id)!).map((p) => ({ id: p.id, seccion: p.ruta.slice(1), icono: p.menu!.icono, texto: p.menu!.texto }));

export const pantalla = (id: PantallaId) => PANTALLAS.find((p) => p.id === id)!;
