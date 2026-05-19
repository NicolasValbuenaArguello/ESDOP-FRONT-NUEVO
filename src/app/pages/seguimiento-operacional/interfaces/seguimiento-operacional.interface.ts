/**
 * Representa un evento operacional recibido desde el backend FastAPI.
 * Incluye todos los campos relevantes para graficar y filtrar en el mapa táctico.
 */
export interface EventoOperacional {
  hr: string;
  hop_fecha_hecho?: string;
  hop_hora_hecho?: string;
  hop_depto?: string;
  hop_mpio?: string;
  hop_lugar?: string;
  hop_sitio?: string;
  hop_lat: string;
  hop_lon: string;
  hop_enemigo?: string;
  res_accion?: string;
  nivel_riesgo: number;
  unidad_operacional: string;
  fecha_insitop?: string;
  comandante?: string;
  celular_comandante?: string;
  oficiales?: string;
  suboficiales?: string;
  slp?: string;
  sl18?: string;
  sl12?: string;
  exde?: string;
  unidad_latitud?: string;
  unidad_longitud?: string;
  distancia_metros?: number;
  total_incidencias_sector?: number;
  alerta: string;
}
export type SeguimientoMenuIcon =
  | 'bi-bell'
  | 'bi-broadcast-pin'
  | 'bi-truck'
  | 'bi-exclamation-triangle'
  | 'bi-activity'
  | 'bi-radioactive'
  | 'bi-pause-circle'
  | 'bi-speedometer2'
  | 'bi-shield-exclamation'
  | 'bi-geo-alt'
  | 'bi-diagram-3'
  | 'bi-bar-chart-line';

export type SeguimientoSeveridad = 'alta' | 'media' | 'baja';
export type SeguimientoEstado = 'activo' | 'monitoreo' | 'cerrado';
export type SeguimientoTono = 'info' | 'alerta' | 'critico' | 'estable';

export interface SeguimientoFiltroState {
  lapso: '24h' | '48h' | '7d' | '30d';
  prioridad: 'todas' | SeguimientoSeveridad;
  unidad: string;
  estado: 'todos' | SeguimientoEstado;
}

export interface SeguimientoMetrica {
  label: string;
  valor: string;
  tendencia: string;
}

export interface SeguimientoCardOperacional {
  id: string;
  titulo: string;
  valor: string;
  descripcion: string;
  icono: SeguimientoMenuIcon;
  tono: SeguimientoTono;
}

export interface SeguimientoAlerta {
  id: string;
  titulo: string;
  detalle: string;
  tiempo: string;
  severidad: SeguimientoSeveridad;
  estado: SeguimientoEstado;
  unidad: string;
}

export interface SeguimientoTablaRow {
  id: string;
  unidad: string;
  sector: string;
  estado: SeguimientoEstado;
  prioridad: SeguimientoSeveridad;
  actualizacion: string;
  detalle: string;
}

export interface SeguimientoMapaMarcador {
  id: string;
  titulo: string;
  detalle: string;
  unidad: string;
  prioridad: SeguimientoSeveridad;
  estado: SeguimientoEstado;
  latitud: number;
  longitud: number;
  color: string;
  unidad_latitud?: number;
unidad_longitud?: number;
alerta?: string;
popup?: string;
}

export interface SeguimientoTimelineItem {
  id: string;
  titulo: string;
  descripcion: string;
  hora: string;
}

export interface SeguimientoSubmenu {
  id: string;
  nombre: string;
  descripcion: string;
  icono: SeguimientoMenuIcon;
  estado: string;
  etiqueta: string;
  resumen: string;
  metricas: SeguimientoMetrica[];
  cards: SeguimientoCardOperacional[];
  capacidades: string[];
  alertas: SeguimientoAlerta[];
  tabla: SeguimientoTablaRow[];
  marcadores: SeguimientoMapaMarcador[];
  timeline: SeguimientoTimelineItem[];
}

export interface SeguimientoMenu {
  nombre: string;
  icono: SeguimientoMenuIcon;
  abierto: boolean;
  submenus: SeguimientoSubmenu[];
}

/**
 * Tarjeta de resumen usada por el shell principal para exponer
 * conteos derivados sin acoplar el layout al origen de datos.
 */
export interface SeguimientoResumenVista {
  id: string;
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: SeguimientoTono;
}

export interface SeguimientoFiltrosAvanzados {
  modoFecha: 'preset' | 'rango';
  preset: 'hoy' | '24h' | '48h' | '7d' | '30d';
  fechaInicial: string;
  fechaFinal: string;
  fechaAlerta?: string;
}

export type SeguimientoSeccionClave =
  | 'resumen'
  | 'indicadores'
  | 'alertas'
  | 'estadisticas'
  | 'eventos'
  | 'mapa';

export interface SeguimientoSeccionVisible {
  clave: SeguimientoSeccionClave;
  etiqueta: string;
  visible: boolean;
}

export interface SeguimientoSidebarLayoutState {
  visible: boolean;
  compacto: boolean;
  width: number;
}

export interface SeguimientoMapState {
  visible: boolean;
  expandido: boolean;
  fullscreen: boolean;
  modoTactico: boolean;
}
