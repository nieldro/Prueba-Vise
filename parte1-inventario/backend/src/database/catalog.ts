/**
 * Catálogo de ejemplo: equipos que usa una empresa de seguridad y vigilancia.
 * Las imágenes viven en frontend/public/products (las genera scripts/generate-product-art.mjs).
 */
export interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  price: number;
  brand: string;
  unit: string;
  /** Prefijo de los archivos de imagen: /products/<art>-1.svg, -2.svg, -3.svg */
  art: string;
  description: string;
  specs: Array<{ label: string; value: string }>;
  /** Escala del volumen de movimientos: 1 = alta rotación, 0.1 = pocas unidades. */
  volume: number;
}

export const CATEGORIES = [
  'Videovigilancia',
  'Control de acceso y alarmas',
  'Comunicaciones y rastreo',
  'Protección personal',
  'Equipo de patrullaje',
  'Armamento autorizado',
  'Prevención de incendios',
];

/** Productos que terminan con stock bajo para que el tablero tenga alertas reales. */
export const LOW_STOCK_SKUS = ['ARM-0001', 'PAT-0002', 'ACC-0003'];

const PERMIT = 'Venta, tenencia y porte sujetos a permiso vigente de la autoridad competente.';

export const PRODUCTS: SeedProduct[] = [
  {
    sku: 'VID-0001', name: 'Cámara domo IP 4MP', category: 'Videovigilancia', price: 389900,
    brand: 'VigiTec', unit: 'Und', art: 'dome', volume: 0.6,
    description: 'Cámara domo para interiores con visión nocturna y detección de movimiento. Alimentación PoE.',
    specs: [
      { label: 'Resolución', value: '4 MP (2688 x 1520)' },
      { label: 'Visión nocturna', value: 'Hasta 30 m' },
      { label: 'Lente', value: '2.8 mm gran angular' },
      { label: 'Alimentación', value: 'PoE 802.3af' },
    ],
  },
  {
    sku: 'VID-0002', name: 'Cámara bala exterior 2MP', category: 'Videovigilancia', price: 249900,
    brand: 'VigiTec', unit: 'Und', art: 'bullet', volume: 0.6,
    description: 'Cámara tipo bala para exteriores con carcasa metálica resistente a la intemperie.',
    specs: [
      { label: 'Resolución', value: '2 MP (1920 x 1080)' },
      { label: 'Protección', value: 'IP67' },
      { label: 'Visión nocturna', value: 'Hasta 40 m' },
      { label: 'Alimentación', value: '12 V DC / PoE' },
    ],
  },
  {
    sku: 'VID-0003', name: 'Grabador NVR 16 canales', category: 'Videovigilancia', price: 1290000,
    brand: 'VigiTec', unit: 'Und', art: 'nvr', volume: 0.25,
    description: 'Grabador de video en red para 16 cámaras IP con acceso remoto desde celular.',
    specs: [
      { label: 'Canales', value: '16 IP' },
      { label: 'Almacenamiento', value: '2 bahías, hasta 16 TB' },
      { label: 'Salida de video', value: 'HDMI 4K / VGA' },
      { label: 'Acceso remoto', value: 'App móvil y web' },
    ],
  },
  {
    sku: 'ACC-0001', name: 'Lector biométrico de huella', category: 'Control de acceso y alarmas', price: 459000,
    brand: 'AccesoPro', unit: 'Und', art: 'access', volume: 0.35,
    description: 'Terminal de control de acceso y asistencia con lector de huella y tarjeta de proximidad.',
    specs: [
      { label: 'Capacidad', value: '3.000 huellas' },
      { label: 'Tarjetas', value: 'Proximidad 125 kHz' },
      { label: 'Comunicación', value: 'TCP/IP, Wiegand' },
      { label: 'Pantalla', value: 'LCD a color 2.8"' },
    ],
  },
  {
    sku: 'ACC-0002', name: 'Sensor de movimiento PIR', category: 'Control de acceso y alarmas', price: 69900,
    brand: 'SafeLine', unit: 'Und', art: 'pir', volume: 1,
    description: 'Sensor infrarrojo pasivo para alarmas, con inmunidad a mascotas de hasta 25 kg.',
    specs: [
      { label: 'Alcance', value: '12 m / 110°' },
      { label: 'Alimentación', value: '9-16 V DC' },
      { label: 'Salida', value: 'Relé NC' },
      { label: 'Instalación', value: 'Pared o esquina' },
    ],
  },
  {
    sku: 'ACC-0003', name: 'Sirena con estrobo', category: 'Control de acceso y alarmas', price: 89900,
    brand: 'SafeLine', unit: 'Und', art: 'siren', volume: 0.6,
    description: 'Sirena de alta potencia con luz estroboscópica para sistemas de alarma.',
    specs: [
      { label: 'Potencia sonora', value: '120 dB a 1 m' },
      { label: 'Luz', value: 'Estrobo LED ámbar' },
      { label: 'Alimentación', value: '12 V DC' },
      { label: 'Uso', value: 'Interior y exterior' },
    ],
  },
  {
    sku: 'ACC-0004', name: 'Candado de alta seguridad', category: 'Control de acceso y alarmas', price: 74900,
    brand: 'Aegis', unit: 'Und', art: 'padlock', volume: 0.8,
    description: 'Candado de acero endurecido con arco protegido, para portones y casetas de vigilancia.',
    specs: [
      { label: 'Material', value: 'Acero endurecido' },
      { label: 'Arco', value: '12 mm' },
      { label: 'Llaves', value: '3 de seguridad' },
      { label: 'Resistencia', value: 'Anticorte y antipalanca' },
    ],
  },
  {
    sku: 'COM-0001', name: 'Radio portátil digital', category: 'Comunicaciones y rastreo', price: 699000,
    brand: 'ComLink', unit: 'Und', art: 'radio', volume: 0.35,
    description: 'Radio digital de dos vías para guardas y supervisores, con batería de larga duración.',
    specs: [
      { label: 'Canales', value: '16' },
      { label: 'Potencia', value: '5 W UHF' },
      { label: 'Batería', value: 'Li-ion 2.200 mAh' },
      { label: 'Protección', value: 'IP67' },
    ],
  },
  {
    sku: 'COM-0002', name: 'Rastreador GPS vehicular', category: 'Comunicaciones y rastreo', price: 189000,
    brand: 'ComLink', unit: 'Und', art: 'gps', volume: 0.5,
    description: 'Dispositivo GPS para seguimiento de vehículos y rutas de patrullaje en tiempo real.',
    specs: [
      { label: 'Posicionamiento', value: 'GPS + GLONASS' },
      { label: 'Red', value: '4G LTE' },
      { label: 'Batería de respaldo', value: '450 mAh' },
      { label: 'Alimentación', value: '9-36 V DC' },
    ],
  },
  {
    sku: 'EPP-0001', name: 'Chaleco antibalas nivel IIIA', category: 'Protección personal', price: 3200000,
    brand: 'Aegis', unit: 'Und', art: 'vest', volume: 0.12,
    description: 'Chaleco balístico de uso externo con paneles removibles. Incluye funda y certificado de fabricación.',
    specs: [
      { label: 'Nivel de protección', value: 'NIJ IIIA' },
      { label: 'Tallas', value: 'S a XL' },
      { label: 'Peso', value: '2.4 kg' },
      { label: 'Vida útil', value: '5 años' },
    ],
  },
  {
    sku: 'EPP-0002', name: 'Casco táctico', category: 'Protección personal', price: 520000,
    brand: 'Aegis', unit: 'Und', art: 'helmet', volume: 0.2,
    description: 'Casco táctico ligero con rieles laterales y sistema de ajuste rápido.',
    specs: [
      { label: 'Material', value: 'Polietileno de alta densidad' },
      { label: 'Peso', value: '1.1 kg' },
      { label: 'Ajuste', value: 'Dial trasero' },
      { label: 'Accesorios', value: 'Rieles laterales y frontal' },
    ],
  },
  {
    sku: 'PAT-0001', name: 'Esposas de acero', category: 'Equipo de patrullaje', price: 59000,
    brand: 'Aegis', unit: 'Par', art: 'cuffs', volume: 0.6,
    description: 'Esposas de acero con doble traba y llave universal.',
    specs: [
      { label: 'Material', value: 'Acero al carbono' },
      { label: 'Cierre', value: 'Doble traba' },
      { label: 'Llaves', value: '2 incluidas' },
      { label: 'Acabado', value: 'Níquel' },
    ],
  },
  {
    sku: 'PAT-0002', name: 'Linterna táctica recargable', category: 'Equipo de patrullaje', price: 129000,
    brand: 'LumaGuard', unit: 'Und', art: 'flashlight', volume: 0.6,
    description: 'Linterna LED de alta potencia con cuerpo de aluminio, para rondas nocturnas.',
    specs: [
      { label: 'Luminosidad', value: '1.200 lúmenes' },
      { label: 'Alcance', value: '300 m' },
      { label: 'Batería', value: 'Recargable 18650' },
      { label: 'Modos', value: 'Alto, medio, bajo y estrobo' },
    ],
  },
  {
    sku: 'PAT-0003', name: 'Bastón tonfa', category: 'Equipo de patrullaje', price: 64000,
    brand: 'Aegis', unit: 'Und', art: 'tonfa', volume: 0.5,
    description: 'Bastón de control de polímero con empuñadura lateral antideslizante.',
    specs: [
      { label: 'Material', value: 'Polímero reforzado' },
      { label: 'Longitud', value: '60 cm' },
      { label: 'Empuñadura', value: 'Estriada' },
      { label: 'Peso', value: '0.5 kg' },
    ],
  },
  {
    sku: 'PAT-0004', name: 'Detector de metales manual', category: 'Equipo de patrullaje', price: 239000,
    brand: 'SafeLine', unit: 'Und', art: 'detector', volume: 0.35,
    description: 'Detector de metales de mano para control de ingreso de personas.',
    specs: [
      { label: 'Sensibilidad', value: 'Ajustable' },
      { label: 'Alertas', value: 'Sonora y vibración' },
      { label: 'Batería', value: '9 V, 40 h' },
      { label: 'Profundidad', value: 'Hasta 7 cm' },
    ],
  },
  {
    sku: 'ARM-0001', name: 'Revólver calibre .38 Especial', category: 'Armamento autorizado', price: 2650000,
    brand: 'Indumil', unit: 'Und', art: 'revolver', volume: 0.1,
    description: `Revólver de 6 disparos para servicio de vigilancia. ${PERMIT}`,
    specs: [
      { label: 'Calibre', value: '.38 Especial' },
      { label: 'Capacidad', value: '6 disparos' },
      { label: 'Cañón', value: '4 pulgadas' },
      { label: 'Control', value: 'Registro por número de serie' },
    ],
  },
  {
    sku: 'ARM-0002', name: 'Pistola semiautomática 9 mm', category: 'Armamento autorizado', price: 3900000,
    brand: 'Indumil', unit: 'Und', art: 'pistol', volume: 0.1,
    description: `Pistola de servicio con seguros múltiples. ${PERMIT}`,
    specs: [
      { label: 'Calibre', value: '9 x 19 mm' },
      { label: 'Capacidad', value: '15 + 1' },
      { label: 'Cañón', value: '4.5 pulgadas' },
      { label: 'Control', value: 'Registro por número de serie' },
    ],
  },
  {
    sku: 'INC-0001', name: 'Extintor ABC 10 lb', category: 'Prevención de incendios', price: 98000,
    brand: 'FuegoStop', unit: 'Und', art: 'extinguisher', volume: 0.5,
    description: 'Extintor de polvo químico multipropósito para fuegos clase A, B y C, con soporte de pared.',
    specs: [
      { label: 'Agente', value: 'Polvo químico ABC' },
      { label: 'Capacidad', value: '10 lb (4.5 kg)' },
      { label: 'Presión', value: '195 psi' },
      { label: 'Recarga', value: 'Anual' },
    ],
  },
];
