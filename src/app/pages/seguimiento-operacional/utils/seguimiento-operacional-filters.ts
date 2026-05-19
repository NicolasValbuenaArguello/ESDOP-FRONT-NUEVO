import {
  OperationalCardId,
  OperationalDashboardViewModel,
  OperationalDivisionChip,
  OperationalFeature,
  OperationalFilterOptions,
  OperationalFilterState,
  OperationalKpiCard,
  OperationalMapFeature,
  OperationalMapMovement,
  OperationalMapRenderModel,
  OperationalMovement,
  OperationalPanelDetail,
  OperationalSnapshot,
  OperationalTableRow
} from '../interfaces/seguimiento-operacional-dashboard.interface';

export const DEFAULT_OPERATIONAL_FILTERS: OperationalFilterState = {
  division: 'TODAS',
  brigada: 'TODAS',
  unidad: 'TODAS',
  departamento: 'TODOS',
  municipio: 'TODOS',
  alerta: 'TODAS',
  operacion: 'TODAS',
  exde: 'TODOS'
};

interface FilteredSnapshot {
  allFeatures: OperationalFeature[];
  mapFeatures: OperationalFeature[];
  summaryPelotones: OperationalFeature[];
  summaryExde: OperationalFeature[];
  movements: OperationalMovement[];
}

/**
 * Extrae catalogos dinamicos desde el snapshot ya adaptado.
 */
export function buildOperationalFilterOptions(snapshot: OperationalSnapshot): OperationalFilterOptions {
  const features = allFeatures(snapshot);

  return {
    divisiones: collect(features, (item) => item.division),
    brigadas: collect(features, (item) => item.brigada),
    unidades: collect(features, (item) => item.unidad),
    departamentos: collect(features, (item) => item.departamento),
    municipios: collect(features, (item) => item.municipio),
    operaciones: collect(features, (item) => item.operacion)
  };
}

/**
 * Construye un view model completamente derivado.
 * El template solo consume propiedades ya preparadas.
 */
export function buildOperationalViewModel(input: {
  snapshot: OperationalSnapshot;
  filters: OperationalFilterState;
  selectedCardId: OperationalCardId;
  selectedFeatureId: string | null;
  refreshLabel: string;
}): OperationalDashboardViewModel {
  const filtered = filterSnapshot(input.snapshot, input.filters, input.selectedCardId);
  const selectedFeature = resolveSelectedFeature(filtered.mapFeatures, input.selectedFeatureId);
  const tableRows = buildTableRows(filtered.mapFeatures, filtered.movements);
  const mapModel = buildMapModel(filtered.mapFeatures, filtered.movements, selectedFeature?.id || null);

  return {
    headerTitle: 'Seguimiento Operacional Tactico',
    headerDescription: 'Mapa tactico sincronizado con filtros reales, capas ligeras y foco operacional sobre la informacion georreferenciada.',
    headerStatus: `${filtered.mapFeatures.length} elementos geograficos visibles | ${filtered.movements.length} movimientos`,
    refreshLabel: input.refreshLabel,
    kpis: buildKpis(filtered, input.selectedCardId),
    divisionChips: buildDivisionChips(filtered.allFeatures, input.filters.division),
    tableRows,
    selectedDetail: selectedFeature ? buildPanelDetail(selectedFeature) : null,
    visibleCounts: {
      pelotones: sumSummaryMetric(filtered.summaryPelotones, ['total_pelotones', 'total', 'cantidad']),
      operaciones: countPelotonesByOperacion(filtered.summaryPelotones, 'Operacion'),
      entrenamiento: countPelotonesByOperacion(filtered.summaryPelotones, 'Entrenamiento'),
      descanso: countPelotonesByOperacion(filtered.summaryPelotones, 'Descanso'),
      exde: sumSummaryMetric(filtered.summaryExde, ['total_exde', 'total', 'cantidad']),
      alertasCriticas: filtered.mapFeatures.filter((item) => item.risk === 'critico' || item.risk === 'alto').length
    },
    activeCardId: input.selectedCardId,
    tableCountLabel: `${tableRows.length} registros tacticos`,
    mapModel
  };
}

export function nextSelectedFeatureId(
  snapshot: OperationalSnapshot,
  filters: OperationalFilterState,
  cardId: OperationalCardId,
  currentId: string | null
) {
  const filtered = filterSnapshot(snapshot, filters, cardId);
  const current = filtered.mapFeatures.find((item) => item.id === currentId);
  return current?.id || filtered.mapFeatures[0]?.id || null;
}

export function buildQuickFilterSummary(filters: OperationalFilterState) {
  return [
    filters.division === 'TODAS' ? 'Todas las divisiones' : `Division ${filters.division}`,
    filters.brigada === 'TODAS' ? 'Todas las brigadas' : `Brigada ${filters.brigada}`,
    filters.unidad === 'TODAS' ? 'Todas las unidades' : `Unidad ${filters.unidad}`,
    filters.departamento === 'TODOS' ? 'Todos los departamentos' : filters.departamento,
    filters.alerta === 'TODAS' ? 'Todas las alertas' : `Alerta ${filters.alerta}`,
    filters.operacion === 'TODAS' ? 'Todas las operaciones' : filters.operacion,
    filters.exde === 'TODOS' ? 'EXDE todos' : `EXDE ${filters.exde}`
  ];
}

export function buildSummaryByDivision(features: OperationalFeature[], keys: string[]) {
  const groups = new Map<string, number>();
  for (const item of features) {
    const division = item.division || 'Sin division';
    groups.set(division, (groups.get(division) || 0) + readMetric(item, keys));
  }
  return Array.from(groups.entries())
    .map(([division, total]) => ({ id: division, label: division, total }))
    .sort((left, right) => right.total - left.total);
}

export function buildPelotonStatusByDivision(features: OperationalFeature[]) {
  const groups = new Map<string, { division: string; operaciones: number; entrenamiento: number; descanso: number; total: number }>();

  for (const item of features) {
    const division = item.division || 'Sin division';
    const current = groups.get(division) || {
      division,
      operaciones: 0,
      entrenamiento: 0,
      descanso: 0,
      total: 0
    };
    const amount = readMetric(item, ['total_pelotones', 'total', 'cantidad']);
    current.total += amount;
    if (item.operacion === 'Entrenamiento') {
      current.entrenamiento += amount;
    } else if (item.operacion === 'Descanso') {
      current.descanso += amount;
    } else {
      current.operaciones += amount;
    }
    groups.set(division, current);
  }

  return Array.from(groups.values()).sort((left, right) => right.total - left.total);
}

function filterSnapshot(snapshot: OperationalSnapshot, filters: OperationalFilterState, cardId: OperationalCardId): FilteredSnapshot {
  const all = allFeatures(snapshot).filter((item) => matchesFeatureFilters(item, filters));
  const mapFeatures = [
    ...snapshot.eventos,
    ...snapshot.informacionInsitop,
    ...snapshot.unidadesAisladas
  ]
    .filter((item) => item.lat != null && item.lon != null)
    .filter((item) => matchesFeatureFilters(item, filters))
    .filter((item) => matchesCard(item, cardId));

  const movements = snapshot.movimientos
    .filter((item) => matchesMovementFilters(item, filters))
    .filter(() => cardId !== 'pelotones' && cardId !== 'exde');

  return {
    allFeatures: all,
    mapFeatures,
    summaryPelotones: snapshot.pelotones.filter((item) => matchesFeatureFilters(item, filters)),
    summaryExde: snapshot.exde.filter((item) => matchesFeatureFilters(item, filters)),
    movements
  };
}

function matchesFeatureFilters(feature: OperationalFeature, filters: OperationalFilterState) {
  if (filters.division !== 'TODAS' && feature.division !== filters.division) return false;
  if (filters.brigada !== 'TODAS' && feature.brigada !== filters.brigada) return false;
  if (filters.unidad !== 'TODAS' && feature.unidad !== filters.unidad) return false;
  if (filters.departamento !== 'TODOS' && feature.departamento !== filters.departamento) return false;
  if (filters.municipio !== 'TODOS' && feature.municipio !== filters.municipio) return false;
  if (filters.alerta !== 'TODAS' && feature.alerta.toUpperCase() !== filters.alerta) return false;
  if (filters.operacion !== 'TODAS' && feature.operacion !== filters.operacion) return false;
  if (filters.exde === 'SI' && !feature.exde) return false;
  if (filters.exde === 'NO' && feature.exde) return false;
  return true;
}

function matchesMovementFilters(movement: OperationalMovement, filters: OperationalFilterState) {
  if (filters.division !== 'TODAS' && movement.division !== filters.division) return false;
  if (filters.brigada !== 'TODAS' && movement.brigada !== filters.brigada) return false;
  if (filters.unidad !== 'TODAS' && movement.unidad !== filters.unidad) return false;
  if (filters.operacion !== 'TODAS' && movement.operacion !== filters.operacion) return false;
  return true;
}

function matchesCard(feature: OperationalFeature, cardId: OperationalCardId) {
  switch (cardId) {
    case 'operacion':
      return feature.type === 'peloton' ? feature.operacion === 'Operacion' : true;
    case 'entrenamiento':
      return feature.type === 'peloton' ? feature.operacion === 'Entrenamiento' : false;
    case 'descanso':
      return feature.type === 'peloton' ? feature.operacion === 'Descanso' : false;
    case 'criticas':
      return feature.risk === 'critico' || feature.risk === 'alto';
    case 'exde':
      return false;
    case 'pelotones':
    default:
      return true;
  }
}

function buildKpis(filtered: FilteredSnapshot, selectedCardId: OperationalCardId): OperationalKpiCard[] {
  return [
    createKpi(
      'pelotones',
      'Pelotones',
      sumSummaryMetric(filtered.summaryPelotones, ['total_pelotones', 'total', 'cantidad']),
      'Ver desglose tactico',
      'bi-diagram-3',
      selectedCardId
    ),
    createKpi(
      'operacion',
      'Operaciones',
      countPelotonesByOperacion(filtered.summaryPelotones, 'Operacion'),
      'Filtra unidades en operacion',
      'bi-broadcast-pin',
      selectedCardId
    ),
    createKpi(
      'entrenamiento',
      'Entrenamiento',
      countPelotonesByOperacion(filtered.summaryPelotones, 'Entrenamiento'),
      'Filtra unidades en entrenamiento',
      'bi-activity',
      selectedCardId
    ),
    createKpi(
      'descanso',
      'Descanso',
      countPelotonesByOperacion(filtered.summaryPelotones, 'Descanso'),
      'Filtra unidades en descanso',
      'bi-pause-circle',
      selectedCardId
    ),
    createKpi(
      'exde',
      'EXDE',
      sumSummaryMetric(filtered.summaryExde, ['total_exde', 'total', 'cantidad']),
      'Abre detalle por division',
      'bi-radioactive',
      selectedCardId
    ),
    createKpi(
      'criticas',
      'Alertas criticas',
      filtered.mapFeatures.filter((item) => item.risk === 'critico' || item.risk === 'alto').length,
      'Filtra mapa automaticamente',
      'bi-exclamation-triangle',
      selectedCardId
    )
  ];
}

function createKpi(
  id: OperationalCardId,
  label: string,
  value: number,
  helper: string,
  iconClass: string,
  selectedCardId: OperationalCardId
): OperationalKpiCard {
  return {
    id,
    label,
    value: String(value),
    helper,
    iconClass,
    active: selectedCardId === id,
    toneClass: selectedCardId === id ? 'is-active' : ''
  };
}

function buildDivisionChips(features: OperationalFeature[], activeDivision: string): OperationalDivisionChip[] {
  const divisions = collect(features, (item) => item.division);
  return [
    { id: 'TODAS', label: 'Todas las divisiones', active: activeDivision === 'TODAS' },
    ...divisions.map((division) => ({
      id: division,
      label: division,
      active: division === activeDivision
    }))
  ];
}

function buildTableRows(features: OperationalFeature[], movements: OperationalMovement[]): OperationalTableRow[] {
  const featureRows = features.map((item) => ({
    id: `feature-${item.id}`,
    featureId: item.id,
    movementId: null,
    unidad: item.unidad,
    comandante: item.comandante,
    division: item.division,
    brigada: item.brigada,
    alerta: item.alerta || item.riskLabel,
    operacion: item.operacion,
    distanciaLabel: formatDistance(item.distanciaMetros),
    ubicacionLabel: formatLocation(item.departamento, item.municipio),
    timestamp: item.timestamp,
    toneClass: `tone-${item.risk}`,
    canShowMap: true,
    canShowDetail: true
  }));

  const movementRows = movements.map((item) => ({
    id: `movement-${item.id}`,
    featureId: null,
    movementId: item.id,
    unidad: item.unidad,
    comandante: 'Movimiento',
    division: item.division,
    brigada: item.brigada,
    alerta: item.risk.toUpperCase(),
    operacion: item.operacion,
    distanciaLabel: formatDistance(item.distanciaMetros),
    ubicacionLabel: 'Ruta tactica',
    timestamp: item.timestamp,
    toneClass: `tone-${item.risk}`,
    canShowMap: true,
    canShowDetail: true
  }));

  return [...featureRows, ...movementRows].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function buildPanelDetail(feature: OperationalFeature): OperationalPanelDetail {
  return {
    title: feature.title,
    subtitle: feature.subtitle,
    riskLabel: feature.riskLabel,
    riskClass: `risk-${feature.risk}`,
    unidad: feature.unidad,
    division: feature.division,
    brigada: feature.brigada,
    comandante: feature.comandante,
    soldados: feature.soldados,
    operacion: feature.operacion,
    observaciones: feature.observaciones,
    incidenciaLabel: feature.incidencias ? `${feature.incidencias} incidencias` : 'Sin incidencias registradas',
    distanciaLabel: formatDistance(feature.distanciaMetros),
    ubicacionLabel: formatLocation(feature.departamento, feature.municipio),
    fechaLabel: feature.timestamp
  };
}

function buildMapModel(features: OperationalFeature[], movements: OperationalMovement[], selectedFeatureId: string | null): OperationalMapRenderModel {
  const mapFeatures: OperationalMapFeature[] = features.map((item) => ({
    id: item.id,
    type: item.type,
    label: item.title,
    popupHtml: item.popupHtml,
    lat: item.lat as number,
    lon: item.lon as number,
    color: item.color,
    iconText: item.iconText,
    pane: resolvePane(item.type),
    pulse: item.type === 'aislada'
  }));

  const mapMovements: OperationalMapMovement[] = movements
    .filter((item) => item.startLat != null && item.startLon != null && item.endLat != null && item.endLon != null)
    .map((item) => ({
      id: item.id,
      popupHtml: item.popupHtml,
      color: item.color,
      weight: 3,
      startLat: item.startLat as number,
      startLon: item.startLon as number,
      endLat: item.endLat as number,
      endLon: item.endLon as number
    }));

  return {
    features: mapFeatures,
    movements: mapMovements,
    selectedFeatureId,
    legendItems: [
      { label: 'Critico', className: 'legend-critico' },
      { label: 'Alto', className: 'legend-alto' },
      { label: 'Medio', className: 'legend-medio' },
      { label: 'Bajo', className: 'legend-bajo' },
      { label: 'INSITOP', className: 'legend-peloton' },
      { label: 'Aislada', className: 'legend-aislada' }
    ],
    totals: {
      visibles: String(mapFeatures.length),
      pelotones: String(mapFeatures.filter((item) => item.type === 'peloton').length),
      alertas: String(mapFeatures.filter((item) => item.type === 'evento').length),
      movimientos: String(mapMovements.length)
    }
  };
}

function resolveSelectedFeature(features: OperationalFeature[], selectedFeatureId: string | null) {
  if (!selectedFeatureId) {
    return features[0] || null;
  }
  return features.find((item) => item.id === selectedFeatureId) || features[0] || null;
}

function allFeatures(snapshot: OperationalSnapshot) {
  return [
    ...snapshot.eventos,
    ...snapshot.informacionInsitop,
    ...snapshot.unidadesAisladas,
    ...snapshot.exde,
    ...snapshot.pelotones,
    ...snapshot.caboCdt,
    ...snapshot.efectivosDisminuidos
  ];
}

function collect<T>(items: T[], resolver: (item: T) => string) {
  return Array.from(new Set(items.map(resolver).filter((value) => !!value && !value.startsWith('Sin ')))).sort();
}

function readMetric(item: OperationalFeature, keys: string[]) {
  for (const key of keys) {
    const value = item.raw[key];
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 1;
}

function sumSummaryMetric(features: OperationalFeature[], keys: string[]) {
  return features.reduce((acc, item) => acc + readMetric(item, keys), 0);
}

function countPelotonesByOperacion(features: OperationalFeature[], operacion: string) {
  return features
    .filter((item) => item.operacion === operacion)
    .reduce((acc, item) => acc + readMetric(item, ['total_pelotones', 'total', 'cantidad']), 0);
}

function formatDistance(distance: number) {
  if (!distance) return '-';
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance.toFixed(0)} m`;
}

function formatLocation(departamento: string, municipio: string) {
  if (municipio && departamento) {
    return `${municipio}, ${departamento}`;
  }
  return municipio || departamento || 'Sin ubicacion';
}

function resolvePane(type: OperationalFeature['type']) {
  switch (type) {
    case 'peloton':
      return 'pelotones';
    case 'aislada':
      return 'aisladas';
    default:
      return 'eventos';
  }
}
