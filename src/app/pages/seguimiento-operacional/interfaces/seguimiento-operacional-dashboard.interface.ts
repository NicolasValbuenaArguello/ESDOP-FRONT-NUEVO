export type OperationalRiskLevel = 'critico' | 'alto' | 'medio' | 'bajo';
export type OperationalEntityType = 'evento' | 'peloton' | 'movimiento' | 'aislada' | 'exde' | 'cabo' | 'efectivo';
export type OperationalPelotonStatus = 'operacion' | 'entrenamiento' | 'descanso';
export type OperationalAlertFilter = 'TODAS' | 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO';
export type OperationalExdeFilter = 'TODOS' | 'SI' | 'NO';
export type OperationalCardId = 'pelotones' | 'operacion' | 'entrenamiento' | 'descanso' | 'exde' | 'criticas';

export interface SeguimientoBackendResponse {
  eventos: unknown;
  informacion_insitop: unknown;
  exde: unknown;
  pelotones: unknown;
  movimientos: unknown;
  unidades_aisladas: unknown;
  cabo_cdt: unknown;
  efectivos_disminuidos: unknown;
}

/**
 * Punto táctico normalizado. Todos los dominios que ocupan el mapa
 * comparten esta forma mínima para simplificar filtros, tabla y panel.
 */
export interface OperationalFeature {
  id: string;
  type: OperationalEntityType;
  risk: OperationalRiskLevel;
  riskLabel: string;
  title: string;
  subtitle: string;
  unidad: string;
  division: string;
  brigada: string;
  comandante: string;
  soldados: string;
  operacion: string;
  observaciones: string;
  alerta: string;
  distanciaMetros: number;
  incidencias: number;
  departamento: string;
  municipio: string;
  exde: boolean;
  lat: number | null;
  lon: number | null;
  timestamp: string;
  color: string;
  iconText: string;
  popupHtml: string;
  raw: Record<string, unknown>;
}

/**
 * Trazado de movimiento simplificado. Se renderiza aparte para no cargar
 * el cluster con polylines ni puntos auxiliares.
 */
export interface OperationalMovement {
  id: string;
  unidad: string;
  division: string;
  brigada: string;
  operacion: string;
  observaciones: string;
  risk: OperationalRiskLevel;
  color: string;
  distanciaMetros: number;
  startLat: number | null;
  startLon: number | null;
  endLat: number | null;
  endLon: number | null;
  timestamp: string;
  popupHtml: string;
  raw: Record<string, unknown>;
}

export interface OperationalSnapshot {
  eventos: OperationalFeature[];
  pelotones: OperationalFeature[];
  informacionInsitop: OperationalFeature[];
  exde: OperationalFeature[];
  unidadesAisladas: OperationalFeature[];
  caboCdt: OperationalFeature[];
  efectivosDisminuidos: OperationalFeature[];
  movimientos: OperationalMovement[];
}

export interface OperationalFilterState {
  division: string;
  brigada: string;
  unidad: string;
  departamento: string;
  municipio: string;
  alerta: OperationalAlertFilter;
  operacion: string;
  exde: OperationalExdeFilter;
}

export interface OperationalFilterOptions {
  divisiones: string[];
  brigadas: string[];
  unidades: string[];
  departamentos: string[];
  municipios: string[];
  operaciones: string[];
}

export interface OperationalKpiCard {
  id: OperationalCardId;
  label: string;
  value: string;
  helper: string;
  iconClass: string;
  active: boolean;
  toneClass: string;
}

export interface OperationalDivisionChip {
  id: string;
  label: string;
  active: boolean;
}

export interface OperationalPanelDetail {
  title: string;
  subtitle: string;
  riskLabel: string;
  riskClass: string;
  unidad: string;
  division: string;
  brigada: string;
  comandante: string;
  soldados: string;
  operacion: string;
  observaciones: string;
  incidenciaLabel: string;
  distanciaLabel: string;
  ubicacionLabel: string;
  fechaLabel: string;
}

export interface OperationalTableRow {
  id: string;
  featureId: string | null;
  movementId: string | null;
  unidad: string;
  comandante: string;
  division: string;
  brigada: string;
  alerta: string;
  operacion: string;
  distanciaLabel: string;
  ubicacionLabel: string;
  timestamp: string;
  toneClass: string;
  canShowMap: boolean;
  canShowDetail: boolean;
}

export interface OperationalMapFeature {
  id: string;
  type: OperationalEntityType;
  label: string;
  popupHtml: string;
  lat: number;
  lon: number;
  color: string;
  iconText: string;
  pane: 'eventos' | 'pelotones' | 'aisladas' | 'exde';
  pulse: boolean;
}

export interface OperationalMapMovement {
  id: string;
  popupHtml: string;
  color: string;
  weight: number;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

export interface OperationalMapRenderModel {
  features: OperationalMapFeature[];
  movements: OperationalMapMovement[];
  selectedFeatureId: string | null;
  legendItems: Array<{ label: string; className: string }>;
  totals: {
    visibles: string;
    pelotones: string;
    alertas: string;
    movimientos: string;
  };
}

export interface OperationalDashboardViewModel {
  headerTitle: string;
  headerDescription: string;
  headerStatus: string;
  refreshLabel: string;
  kpis: OperationalKpiCard[];
  divisionChips: OperationalDivisionChip[];
  tableRows: OperationalTableRow[];
  selectedDetail: OperationalPanelDetail | null;
  visibleCounts: {
    pelotones: number;
    operaciones: number;
    entrenamiento: number;
    descanso: number;
    exde: number;
    alertasCriticas: number;
  };
  activeCardId: string;
  tableCountLabel: string;
  mapModel: OperationalMapRenderModel;
}
