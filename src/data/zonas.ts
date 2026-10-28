/* ==========================================================================
   Zonas de Cancún y alrededores con coordenadas aproximadas (datos ficticios del prototipo).
   El buscador del mapa del inicio (components/MapPicker.tsx) busca aquí, sin API externa.
   ========================================================================== */
export interface Zona { nombre: string; lat: number; lng: number }

export const ZONAS: Zona[] = [
  { nombre: 'Cancún, Quintana Roo', lat: 21.1619, lng: -86.8515 },
  { nombre: 'Residencial Arbolada, Cancún', lat: 21.1035, lng: -86.8670 },
  { nombre: 'Residencial Cumbres, Cancún', lat: 21.1550, lng: -86.8930 },
  { nombre: 'Fraccionamiento Santa Fe, Cancún', lat: 21.1300, lng: -86.8840 },
  { nombre: 'Lagos del Sol, Cancún', lat: 21.1095, lng: -86.8735 },
  { nombre: 'Aqua Residencial, Cancún', lat: 21.0985, lng: -86.8650 },
  { nombre: 'Jardines del Sur, Cancún', lat: 21.1270, lng: -86.8580 },
  { nombre: 'Avenida Huayacán, Cancún', lat: 21.1100, lng: -86.8550 },
  { nombre: 'Residencial Palmaris, Cancún', lat: 21.1460, lng: -86.8800 },
  { nombre: 'Supermanzana 50, Cancún', lat: 21.1590, lng: -86.8410 },
  { nombre: 'Malecón Tajamar, Cancún', lat: 21.1460, lng: -86.8230 },
  { nombre: 'Puerto Cancún, Cancún', lat: 21.1680, lng: -86.8050 },
  { nombre: 'Zona Hotelera, Cancún', lat: 21.1000, lng: -86.7700 },
  { nombre: 'Puerto Morelos, Quintana Roo', lat: 20.8470, lng: -86.8750 },
  { nombre: 'Playa del Carmen, Quintana Roo', lat: 20.6296, lng: -87.0739 },
];
