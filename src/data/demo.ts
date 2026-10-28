import type { Activity, Appointment, Broker, Person, Property, StaffMember } from '../admin/store';
import type { ContratoSemilla, SolicitudSemilla } from '../admin/servicio';

/* ==========================================================================
   Datos ficticios del prototipo (sin base de datos).
   El panel los copia al iniciar (src/admin/store.ts) y los cambios viven en memoria:
   al recargar la página todo vuelve a este estado. Cuando exista el backend, estos mismos
   tipos llegarán del servidor y las pantallas no tendrán que cambiar.
   ========================================================================== */
/** Brokers (asesores) del equipo */
export const BROKERS: Broker[] = [
  { id: 'mariana', name: 'Mariana Solís', initials: 'MS', role: 'Rentas · Arbolada y Aqua', zones: 'Arbolada · Aqua Residencial', email: 'mariana@zugar.example', phone: '+52 998 555 0101', photo: 'asesora-mariana-solis.jpg', active: true },
  { id: 'diego', name: 'Diego Herrera', initials: 'DH', role: 'Ventas · Cumbres y Lagos del Sol', zones: 'Cumbres · Lagos del Sol', email: 'diego@zugar.example', phone: '+52 998 555 0102', photo: '', active: true },
  { id: 'valeria', name: 'Valeria Cruz', initials: 'VC', role: 'Rentas y ventas · Santa Fe', zones: 'Santa Fe · Jardines del Sur', email: 'valeria@zugar.example', phone: '+52 998 555 0103', photo: '', active: true },
];

/** Inventario de casas. status = disponibilidad; visibility = si aparece en el sitio público */
export const PROPERTIES: Property[] = [
  { id: 'ZUG-001', name: 'Casa Ceiba', type: 'Casa', zone: 'Arbolada', city: 'Cancún, Quintana Roo', address: 'Calle Ceiba 24, Residencial Arbolada, C.P. 77560', street: 'Calle Ceiba 24', op: 'renta', price: 28000, rec: 3, banos: 2, m2: 180, terreno: 160, est: 2, age: 5, status: 'disponible', visibility: 'publicada', broker: 'mariana', maintenance: 'Incluido en la renta', deposit: 28000, availableFrom: '2026-10-20', furnished: 'Sin amueblar', desc: 'Casa de dos niveles con sala y comedor abiertos, cocina integral y jardín privado. La luz natural acompaña cada espacio; ideal para una vida tranquila en Arbolada.', amenities: ['Jardín privado', 'Cocina integral', 'Acceso controlado 24/7', 'Se aceptan mascotas'], photos: [{ src: 'casa-ceiba.jpg', label: 'Fachada' }, { src: 'casa-ceiba-cocina.jpg', label: 'Cocina' }, { src: 'casa-ceiba-recamara.jpg', label: 'Recámara' }], published: '2026-10-13', updated: 'Hoy a las 08:45 h', updatedAt: 6 },
  { id: 'ZUG-002', name: 'Casa del Patio', type: 'Casa', zone: 'Residencial Cumbres', city: 'Cancún, Quintana Roo', address: 'Av. Cumbres 118, Residencial Cumbres, C.P. 77560', street: 'Av. Cumbres 118', op: 'venta', price: 4850000, rec: 3, banos: 3, m2: 240, terreno: 210, est: 2, age: 3, status: 'disponible', visibility: 'publicada', broker: 'diego', maintenance: '$2,400 MXN al mes', deposit: 0, availableFrom: '2026-10-01', furnished: 'Sin amueblar', desc: 'Residencia de un nivel organizada alrededor de un patio con pérgola de madera. Espacios amplios, techos altos y una terraza para recibir a la familia.', amenities: ['Jardín privado', 'Cocina integral', 'Acceso controlado 24/7', 'Terraza', 'Casa club'], photos: [{ src: 'casa-del-patio.jpg', label: 'Patio' }], published: '2026-09-28', updated: 'Hace 3 días', updatedAt: 5 },
  { id: 'ZUG-003', name: 'Casa Olivo', type: 'Casa', zone: 'Santa Fe', city: 'Cancún, Quintana Roo', address: 'Calle Olivo 7, Santa Fe, C.P. 77535', street: 'Calle Olivo 7', op: 'renta', price: 22500, rec: 2, banos: 2, m2: 135, terreno: 120, est: 1, age: 8, status: 'rentada', visibility: 'pausada', broker: 'valeria', maintenance: 'Incluido en la renta', deposit: 22500, availableFrom: '2026-06-01', furnished: 'Semiamueblada', desc: 'Casa compacta y luminosa de estilo caribeño, con balcón en planta alta y cocina abierta. Cerca de escuelas y plazas comerciales.', amenities: ['Cocina integral', 'Terraza'], photos: [{ src: 'casa-olivo.jpg', label: 'Fachada' }], published: '2026-05-12', updated: 'Hace 2 semanas', updatedAt: 4 },
  { id: 'ZUG-004', name: 'Casa de la Luz', type: 'Casa', zone: 'Lagos del Sol', city: 'Cancún, Quintana Roo', address: 'Paseo Lagos del Sol 52, C.P. 77560', street: 'Paseo Lagos del Sol 52', op: 'venta', price: 6200000, rec: 4, banos: 4, m2: 320, terreno: 300, est: 3, age: 2, status: 'reservada', visibility: 'publicada', broker: 'diego', maintenance: '$3,100 MXN al mes', deposit: 0, availableFrom: '2026-11-15', furnished: 'Sin amueblar', desc: 'Residencia de dos niveles con grandes ventanales, alberca privada y vista a las áreas verdes del residencial.', amenities: ['Alberca', 'Jardín privado', 'Casa club', 'Acceso controlado 24/7', 'Terraza'], photos: [{ src: 'casa-de-la-luz.jpg', label: 'Fachada' }], published: '2026-09-02', updated: 'Ayer a las 16:20 h', updatedAt: 3 },
  { id: 'ZUG-005', name: 'Casa Nativa', type: 'Casa en condominio', zone: 'Aqua Residencial', city: 'Cancún, Quintana Roo', address: 'Circuito Aqua 31, Aqua Residencial, C.P. 77560', street: 'Circuito Aqua 31', op: 'renta', price: 35000, rec: 3, banos: 3, m2: 210, terreno: 180, est: 2, age: 4, status: 'disponible', visibility: 'publicada', broker: 'mariana', maintenance: 'Incluido en la renta', deposit: 35000, availableFrom: '2026-11-01', furnished: 'Amueblada', desc: 'Casa con fachada de madera y piedra, alberca y terraza techada. Se entrega amueblada y lista para habitar.', amenities: ['Alberca', 'Amueblada', 'Se aceptan mascotas', 'Acceso controlado 24/7', 'Terraza'], photos: [{ src: 'casa-nativa.jpg', label: 'Alberca' }], published: '2026-10-05', updated: 'Hace 4 días', updatedAt: 2 },
  { id: 'ZUG-006', name: 'Casa Almendra', type: 'Casa', zone: 'Jardines del Sur', city: 'Cancún, Quintana Roo', address: 'Calle Almendro 15, Jardines del Sur, C.P. 77536', street: 'Calle Almendro 15', op: 'venta', price: 3450000, rec: 3, banos: 2, m2: 165, terreno: 150, est: 2, age: 6, status: 'borrador', visibility: 'borrador', broker: 'valeria', maintenance: '$1,200 MXN al mes', deposit: 0, availableFrom: '2026-11-01', furnished: 'Sin amueblar', desc: 'Casa familiar con cochera para dos autos y jardín frontal, en una zona tranquila del sur de Cancún.', amenities: ['Jardín privado', 'Cocina integral'], photos: [], published: '', updated: 'Hace 1 semana', updatedAt: 1 },
];

/** Clientes e inquilinos */
export const PEOPLE: Person[] = [
  { id: 'p1', name: 'Ana García López', email: 'ana@example.com', phone: '998 000 0123', type: 'cliente', property: 'ZUG-001', broker: 'mariana', follow: 'Visita confirmada', op: 'Renta', budget: '$30,000 MXN / mes', needs: '3 recámaras · 2 personas · 1 perro pequeño', job: 'Diseño de interiores · Nacionalidad mexicana' },
  { id: 'p2', name: 'Jorge Ramírez', email: 'jorge.r@example.com', phone: '998 555 0124', type: 'cliente', property: 'ZUG-002', broker: 'diego', follow: 'Por confirmar', op: 'Compra', budget: '$5,000,000 MXN', needs: '3 recámaras · 4 personas · Sin mascotas', job: 'Ingeniería civil · Nacionalidad mexicana' },
  { id: 'p3', name: 'Sofía Martínez', email: 'sofia.m@example.com', phone: '998 555 0125', type: 'cliente', property: 'ZUG-005', broker: 'mariana', follow: 'Visita confirmada', op: 'Renta', budget: '$36,000 MXN / mes', needs: '3 recámaras · 3 personas · 1 gato', job: 'Medicina · Nacionalidad mexicana' },
  { id: 'p4', label: 'Inquilina', name: 'Carolina Pérez', email: 'carolina.p@example.com', phone: '998 555 0126', type: 'inquilino', property: 'ZUG-003', broker: 'valeria', follow: 'Contrato vigente', op: 'Renta', budget: '$22,500 MXN / mes', needs: 'Contrato compartido · 2 personas', job: 'Hotelería · Nacionalidad mexicana' },
  { id: 'p5', name: 'Andrés Torres', email: 'andres.t@example.com', phone: '998 555 0127', type: 'cliente', property: 'ZUG-004', broker: 'diego', follow: 'Reservada', op: 'Compra', budget: '$6,500,000 MXN', needs: '4 recámaras · 5 personas · 2 perros', job: 'Empresario · Nacionalidad mexicana' },
  { id: 'p6', name: 'Laura Medina', email: 'laura.m@example.com', phone: '998 555 0128', type: 'cliente', property: 'ZUG-005', broker: 'mariana', follow: 'En seguimiento', op: 'Renta', budget: '$32,000 MXN / mes', needs: '3 recámaras · 2 personas · Sin mascotas', job: 'Arquitectura · Nacionalidad colombiana' },
  { id: 'p7', name: 'Miguel Castillo', email: 'miguel.c@example.com', phone: '998 555 0129', type: 'inquilino', property: 'ZUG-003', broker: 'valeria', follow: 'Contrato vigente', op: 'Renta', budget: '$22,500 MXN / mes', needs: 'Contrato compartido · 2 personas', job: 'Gastronomía · Nacionalidad mexicana' },
  { id: 'p8', name: 'Elena Ruiz', email: 'elena.r@example.com', phone: '998 555 0130', type: 'cliente', property: 'ZUG-006', broker: 'valeria', follow: 'Nuevo contacto', op: 'Compra', budget: '$3,500,000 MXN', needs: '3 recámaras · 3 personas · Sin mascotas', job: 'Docencia · Nacionalidad mexicana' },
];

/** Citas (visitas) de la semana del 20 al 26 de octubre de 2026 */
export const APPOINTMENTS: Appointment[] = [
  { id: 'CIT-020', person: 'p5', property: 'ZUG-004', broker: 'diego', date: '2026-10-20', start: '09:00', end: '09:45', status: 'realizada', kind: 'Presencial', note: '' },
  { id: 'CIT-021', person: 'p6', property: 'ZUG-005', broker: 'mariana', date: '2026-10-21', start: '16:00', end: '16:45', status: 'cancelada', kind: 'Presencial', note: 'Pidió reprogramar para noviembre.' },
  { id: 'CIT-024', person: 'p1', property: 'ZUG-001', broker: 'mariana', date: '2026-10-24', start: '10:00', end: '10:45', status: 'confirmada', kind: 'Presencial', note: 'Nos gustaría conocer el patio y la iluminación de la casa por la mañana.', confirmedBy: 'Confirmada por Mariana · 20 oct., 08:45 h.' },
  { id: 'CIT-025', person: 'p2', property: 'ZUG-002', broker: 'diego', date: '2026-10-24', start: '12:30', end: '13:15', status: 'por-confirmar', kind: 'Presencial', note: 'Quiere revisar la terraza y el estado de la cocina.' },
  { id: 'CIT-026', person: 'p3', property: 'ZUG-005', broker: 'mariana', date: '2026-10-25', start: '11:00', end: '11:45', status: 'confirmada', kind: 'Presencial', note: 'Viene con su pareja; preguntan por el reglamento de mascotas.', confirmedBy: 'Confirmada por Mariana · 19 oct., 18:10 h.' },
];

/** Actividad reciente del resumen */
export const ACTIVITY: Activity[] = [
  { when: 'Hoy · 08:45 h', text: 'Mariana confirmó la visita de Ana a Casa Ceiba.' },
  { when: 'Ayer · 16:20 h', text: 'Diego marcó Casa de la Luz como reservada.' },
];

/** Historial de cambios por propiedad */
export const HISTORY: Record<string, Activity[]> = {
  'ZUG-001': [
    { when: '20 oct. 2026 · 08:45 h', text: 'Mariana Solís confirmó la visita de Ana García López (CIT-024).' },
    { when: '13 oct. 2026 · 10:30 h', text: 'Propiedad publicada en el catálogo público.' },
    { when: '12 oct. 2026 · 17:05 h', text: 'Lucía Méndez creó la propiedad y asignó a Mariana Solís.' },
  ],
};


/* ==========================================================================
   Solicitudes, mensajes, contrato, pagarés, documentos del expediente, avisos y personal.
   Los usa el servicio simulado (src/admin/servicio.ts).
   ========================================================================== */

/** Personal del panel y su rol (lo administra el propietario en «Brokers») */
export const PERSONAL: StaffMember[] = [
  { id: 'lucia', name: 'Lucía Méndez', email: 'lucia@zugar.example', roles: ['owner', 'admin'], active: true, properties: 0 },
  { id: 'mariana', name: 'Mariana Solís', email: 'mariana@zugar.example', roles: ['broker'], active: true, properties: 2 },
  { id: 'diego', name: 'Diego Herrera', email: 'diego@zugar.example', roles: ['broker'], active: true, properties: 2 },
  { id: 'valeria', name: 'Valeria Cruz', email: 'valeria@zugar.example', roles: ['broker', 'admin'], active: true, properties: 2 },
];

/** Solicitudes que llegaron del sitio, de la app o por teléfono. `cita` liga la solicitud con su cita. */
export const SOLICITUDES: (SolicitudSemilla)[] = [
  {
    id: 'sol-0103', folio: 'SOL-0103', reason: 'comprar', name: 'Patricia Gómez', email: 'patricia.g@example.com', phone: '998 555 0140',
    message: 'Busco casa para mi familia, de preferencia en Cumbres o Lagos del Sol.', property: null, preferredDate: null, preferredTime: null,
    payload: { operacion: 'compra', presupuesto_min: 4000000, presupuesto_max: 5000000, recamaras: 3, banos: 2, personas: 4, mascotas: 'no', zona: 'Residencial Cumbres', origen: 'app' },
    status: 'nuevo', createdAt: '2026-10-20T08:10:00-05:00',
  },
  {
    id: 'sol-0102', folio: 'SOL-0102', reason: 'visita', name: 'Roberto Díaz', email: 'roberto.d@example.com', phone: '998 555 0141',
    message: 'Me gustaría verla entre semana por la mañana.', property: 'ZUG-001', preferredDate: '2026-10-23', preferredTime: '11:00',
    payload: { operacion: 'renta', personas: 3, mascotas: 'si', mascotas_detalle: '1 perro mediano', ocupacion: 'Contaduría', nacionalidad: 'Mexicana', origen: 'sitio' },
    status: 'nuevo', createdAt: '2026-10-19T18:42:00-05:00',
  },
  {
    id: 'sol-0101', folio: 'SOL-0101', reason: 'publicar', name: 'Fernando Ríos', email: 'fernando.r@example.com', phone: '998 555 0142',
    message: 'Tengo una casa que quiero rentar con ustedes.', property: null, preferredDate: null, preferredTime: null,
    payload: { inmueble_tipo: 'casa', inmueble_operacion: 'renta', inmueble_zona: 'Malecón Tajamar', inmueble_recamaras: 2, inmueble_precio: 20000, origen: 'sitio' },
    status: 'nuevo', createdAt: '2026-10-18T12:05:00-05:00',
  },
  {
    id: 'sol-0098', folio: 'SOL-0098', reason: 'rentar', name: 'Laura Medina', email: 'laura.m@example.com', phone: '998 555 0128',
    message: 'Busco casa con alberca para 2 personas.', property: null, preferredDate: null, preferredTime: null,
    payload: { operacion: 'renta', presupuesto_min: 28000, presupuesto_max: 32000, recamaras: 3, personas: 2, mascotas: 'no', zona: 'Aqua Residencial', ocupacion: 'Arquitectura', nacionalidad: 'Colombiana', origen: 'sitio' },
    status: 'en_seguimiento', createdAt: '2026-10-15T10:20:00-05:00', proposals: [['ZUG-005', 'Tiene alberca y se entrega amueblada.']],
  },
  {
    id: 'sol-0097', folio: 'SOL-0097', reason: 'visita', name: 'Jorge Ramírez', email: 'jorge.r@example.com', phone: '998 555 0124',
    message: 'Quiero revisar la terraza y el estado de la cocina.', property: 'ZUG-002', preferredDate: '2026-10-24', preferredTime: '12:30',
    payload: { operacion: 'compra', presupuesto_max: 5000000, personas: 4, mascotas: 'no', ocupacion: 'Ingeniería civil', origen: 'sitio' },
    status: 'en_seguimiento', createdAt: '2026-10-17T09:15:00-05:00', cita: 'CIT-025',
  },
  {
    id: 'sol-0095', folio: 'SOL-0095', reason: 'visita', name: 'Ana García López', email: 'ana@example.com', phone: '998 000 0123',
    message: 'Nos gustaría conocer el patio y la iluminación de la casa por la mañana.', property: 'ZUG-001', preferredDate: '2026-10-24', preferredTime: '10:00',
    payload: { operacion: 'renta', presupuesto_max: 30000, recamaras: 3, personas: 2, mascotas: 'si', mascotas_detalle: '1 perro pequeño', ocupacion: 'Diseño de interiores', origen: 'app' },
    status: 'en_seguimiento', createdAt: '2026-10-16T17:30:00-05:00', cita: 'CIT-024',
  },
  {
    id: 'sol-0090', folio: 'SOL-0090', reason: 'comprar', name: 'Andrés Torres', email: 'andres.t@example.com', phone: '998 555 0127',
    message: 'Busco 4 recámaras, con alberca.', property: 'ZUG-004', preferredDate: null, preferredTime: null,
    payload: { operacion: 'compra', presupuesto_max: 6500000, recamaras: 4, personas: 5, mascotas: 'si', mascotas_detalle: '2 perros', origen: 'sitio' },
    status: 'cerrado', createdAt: '2026-10-02T11:00:00-05:00', cita: 'CIT-020',
  },
];

/** Conversación de cada solicitud: [folio, quién escribe, texto, fecha] */
export const MENSAJES: [string, 'staff' | 'cliente', string, string][] = [
  ['sol-0098', 'staff', 'Hola Laura, te propuse Casa Nativa: tiene alberca y se entrega amueblada. ¿Te gustaría visitarla?', '2026-10-15T13:00:00-05:00'],
  ['sol-0098', 'cliente', '¡Sí! Pero en noviembre, este mes viajo.', '2026-10-15T18:22:00-05:00'],
  ['sol-0097', 'staff', 'Jorge, te agendamos el sábado 24 a las 12:30. ¿Te queda bien?', '2026-10-17T10:00:00-05:00'],
];

/** Contrato de renta vigente (Casa Olivo) */
export const CONTRATOS: ContratoSemilla[] = [
  { id: 'con-001', property: 'ZUG-003', client: 'p4', startDate: '2026-06-01', endDate: '2027-05-31', monthlyRent: 22500, paymentDay: 1, deposit: 22500, status: 'active' },
];

/** Pagarés del contrato: los primeros 4 pagados; el de octubre, vencido; el resto por cobrar */
export const PAGOS_REGISTRADOS: Record<number, string> = { 1: '2026-06-01', 2: '2026-07-02', 3: '2026-08-01', 4: '2026-09-03' };

/** Documentos del expediente: [casa, tipo, nombre, descripción, visible al cliente, fecha] */
export const DOCUMENTOS: [string, string, string, string | null, boolean, string][] = [
  ['ZUG-003', 'contract', 'Contrato de arrendamiento firmado', 'Vigencia del 1 de junio de 2026 al 31 de mayo de 2027', true, '2026-05-28T12:00:00-05:00'],
  ['ZUG-003', 'deposit', 'Recibo del depósito en garantía', '$22,500 MXN', true, '2026-05-28T12:10:00-05:00'],
  ['ZUG-003', 'delivery_sheet', 'Ficha de entrega de la casa', 'Inventario y estado de la casa al entregarla', true, '2026-06-01T10:00:00-05:00'],
  ['ZUG-003', 'rules', 'Reglamento del fraccionamiento', null, false, '2026-06-01T10:05:00-05:00'],
];

/** Avisos de la campana: [tipo, título, mensaje, sección, id, minutos atrás, leído] */
export const AVISOS: [string, string, string, string | null, string | null, number, boolean][] = [
  ['lead', 'Nueva solicitud desde la app', 'Patricia Gómez quiere comprar en Cumbres (SOL-0103).', 'lead', 'sol-0103', 35, false],
  ['lead', 'Nueva solicitud de visita', 'Roberto Díaz quiere visitar Casa Ceiba (SOL-0102).', 'lead', 'sol-0102', 14 * 60, false],
  ['promissory_note', 'Pagaré vencido', 'Pagaré 05 de Casa Olivo venció el 1 de octubre.', 'promissory_note', null, 26 * 60, false],
  ['appointment', 'Cita por confirmar', 'Jorge Ramírez aún no confirma su visita a Casa del Patio.', 'appointment', null, 2 * 24 * 60, true],
];
