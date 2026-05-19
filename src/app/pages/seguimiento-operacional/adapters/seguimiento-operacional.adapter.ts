import {
  OperationalFeature,
  OperationalMovement,
  OperationalRiskLevel,
  OperationalSnapshot,
  SeguimientoBackendResponse
} from '../interfaces/seguimiento-operacional-dashboard.interface';

const RISK_COLORS: Record<OperationalRiskLevel, string> = {
  critico: '#c63c53',
  alto: '#d97706',
  medio: '#d4a017',
  bajo: '#2f7a55'
};

/**
 * Normaliza la respuesta exacta del backend a una estructura táctica
 * consistente para que el resto del frontend no dependa de nombres variables.
 */
export function adaptSeguimientoSnapshot(response: SeguimientoBackendResponse): OperationalSnapshot {
  return {
    eventos: toRecordArray(response.eventos).map((item, index) => createFeature(item, 'evento', `evento-${index}`)),
    informacionInsitop: toRecordArray(response.informacion_insitop).map((item, index) => createFeature(item, 'peloton', `insitop-${index}`)),
    exde: toRecordArray(response.exde).map((item, index) => createFeature(item, 'exde', `exde-${index}`)),
    pelotones: toRecordArray(response.pelotones).map((item, index) => createFeature(item, 'peloton', `peloton-${index}`)),
    movimientos: toRecordArray(response.movimientos).map((item, index) => createMovement(item, index)),
    unidadesAisladas: toRecordArray(response.unidades_aisladas).map((item, index) => createFeature(item, 'aislada', `aislada-${index}`)),
    caboCdt: toRecordArray(response.cabo_cdt).map((item, index) => createFeature(item, 'cabo', `cabo-${index}`)),
    efectivosDisminuidos: toRecordArray(response.efectivos_disminuidos).map((item, index) => createFeature(item, 'efectivo', `efectivo-${index}`))
  };
}

function createFeature(
  source: Record<string, unknown>,
  type: OperationalFeature['type'],
  id: string
): OperationalFeature {
  const alert = pickString(source, ['alerta', 'prioridad', 'nivel_alerta'], 'BAJO');
  const risk = resolveRisk(alert, pickNumber(source, ['nivel_riesgo', 'riesgo'], 0));
  const operacion = resolveOperacion(source, type);
  const lat = pickNumberOrNull(source, type === 'peloton'
    ? ['latitud', 'lat', 'hop_lat', 'unidad_latitud']
    : ['hop_lat', 'latitud', 'lat', 'unidad_latitud']);
  const lon = pickNumberOrNull(source, type === 'peloton'
    ? ['longitud', 'lng', 'lon', 'hop_lon', 'unidad_longitud']
    : ['hop_lon', 'longitud', 'lng', 'lon', 'unidad_longitud']);
  const unidad = pickString(source, ['unidad_operacional', 'unidad', 'peloton', 'nombre_unidad'], 'Sin unidad');
  const division = pickString(source, ['division', 'division_ft', 'division_operacional'], 'Sin division');
  const brigada = pickString(source, ['brigada', 'brigada_unidad'], 'Sin brigada');
  const comandante = pickString(source, ['comandante', 'responsable'], 'Sin comandante');
  const soldados = pickString(source, ['soldados', 'efectivos', 'personal'], '-');
  const observaciones = pickString(source, ['observaciones', 'detalle', 'res_accion', 'descripcion'], 'Sin observaciones');
  const titulo = resolveTitle(source, type, unidad);
  const ubicacion = formatUbicacion(
    pickString(source, ['hop_depto', 'departamento']),
    pickString(source, ['hop_mpio', 'municipio'])
  );
  const popupHtml = `
    <div class="popup-shell">
      <span class="popup-kicker">${type.toUpperCase()}</span>
      <h4>${escapeHtml(titulo)}</h4>
      <p>${escapeHtml(observaciones)}</p>
      <ul>
        <li>Unidad: ${escapeHtml(unidad)}</li>
        <li>Comandante: ${escapeHtml(comandante)}</li>
        <li>Alerta: ${escapeHtml(alert)}</li>
        <li>Operacion: ${escapeHtml(operacion)}</li>
        <li>Distancia: ${formatDistance(pickNumber(source, ['distancia_metros', 'distancia'], 0))}</li>
        <li>Fecha: ${escapeHtml(resolveTimestamp(source))}</li>
      </ul>
    </div>
  `;

  return {
    id,
    type,
    risk,
    riskLabel: riskToLabel(risk),
    title: titulo,
    subtitle: observaciones,
    unidad,
    division,
    brigada,
    comandante,
    soldados,
    operacion,
    observaciones,
    alerta: alert,
    distanciaMetros: pickNumber(source, ['distancia_metros', 'distancia'], 0),
    incidencias: pickNumber(source, ['total_incidencias_sector', 'cantidad_incidencias', 'incidencias'], 0),
    departamento: pickString(source, ['hop_depto', 'departamento'], 'Sin departamento'),
    municipio: pickString(source, ['hop_mpio', 'municipio'], 'Sin municipio'),
    exde: resolveExde(source, type),
    lat,
    lon,
    timestamp: resolveTimestamp(source),
    color: resolveFeatureColor(type, risk, operacion),
    iconText: resolveIconText(type),
    popupHtml,
    raw: source
  };
}

function createMovement(source: Record<string, unknown>, index: number): OperationalMovement {
  const risk = resolveRisk(
    pickString(source, ['alerta', 'prioridad'], 'MEDIO'),
    pickNumber(source, ['nivel_riesgo', 'riesgo'], 0)
  );
  const unidad = pickString(source, ['unidad_operacional', 'unidad', 'peloton'], 'Sin unidad');
  const division = pickString(source, ['division', 'division_ft'], 'Sin division');
  const brigada = pickString(source, ['brigada', 'brigada_unidad'], 'Sin brigada');
  const operacion = resolveOperacion(source, 'movimiento');
  const observaciones = pickString(source, ['observaciones', 'detalle', 'descripcion'], 'Movimiento operacional');
  const popupHtml = `
    <div class="popup-shell">
      <span class="popup-kicker">MOVIMIENTO</span>
      <h4>${escapeHtml(unidad)}</h4>
      <p>${escapeHtml(observaciones)}</p>
      <ul>
        <li>Division: ${escapeHtml(division)}</li>
        <li>Brigada: ${escapeHtml(brigada)}</li>
        <li>Operacion: ${escapeHtml(operacion)}</li>
        <li>Distancia: ${formatDistance(pickNumber(source, ['distancia_metros', 'distancia'], 0))}</li>
      </ul>
    </div>
  `;

  return {
    id: `movimiento-${index}`,
    unidad,
    division,
    brigada,
    operacion,
    observaciones,
    risk,
    color: RISK_COLORS[risk],
    distanciaMetros: pickNumber(source, ['distancia_metros', 'distancia'], 0),
    startLat: pickNumberOrNull(source, ['origen_lat', 'start_lat', 'unidad_latitud', 'latitud_origen']),
    startLon: pickNumberOrNull(source, ['origen_lon', 'origen_lng', 'start_lon', 'unidad_longitud', 'longitud_origen']),
    endLat: pickNumberOrNull(source, ['destino_lat', 'end_lat', 'hop_lat', 'latitud_destino']),
    endLon: pickNumberOrNull(source, ['destino_lon', 'destino_lng', 'end_lon', 'hop_lon', 'longitud_destino']),
    timestamp: resolveTimestamp(source),
    popupHtml,
    raw: source
  };
}

function resolveTitle(source: Record<string, unknown>, type: OperationalFeature['type'], unidad: string) {
  if (type === 'evento') {
    return pickString(source, ['hr', 'titulo', 'tipo_evento'], unidad || 'Evento');
  }
  if (type === 'peloton') {
    return pickString(source, ['peloton', 'nombre_peloton', 'nombre_unidad'], unidad);
  }
  if (type === 'aislada') {
    return pickString(source, ['peloton', 'nombre_unidad', 'unidad'], unidad);
  }
  return pickString(source, ['titulo', 'nombre_unidad', 'unidad'], unidad);
}

function resolveOperacion(source: Record<string, unknown>, type: OperationalFeature['type'] | 'movimiento') {
  const raw = pickString(
    source,
    ['operacion', 'tipo_operacion', 'tarea_operacional', 'estado_operacional', 'actividad'],
    type === 'peloton' ? 'operacion' : 'Seguimiento'
  ).toLowerCase();

  if (type === 'peloton') {
    if (raw.includes('entren')) return 'Entrenamiento';
    if (raw.includes('descans') || raw.includes('reposo')) return 'Descanso';
    return 'Operacion';
  }

  if (!raw) {
    return 'Seguimiento';
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function resolveFeatureColor(type: OperationalFeature['type'], risk: OperationalRiskLevel, operacion: string) {
  if (type === 'peloton') {
    if (operacion === 'Entrenamiento') return '#176785';
    if (operacion === 'Descanso') return '#667085';
    return '#2f7a55';
  }
  if (type === 'aislada') return '#c63c53';
  if (type === 'exde') return '#7d0012';
  return RISK_COLORS[risk];
}

function resolveIconText(type: OperationalFeature['type']) {
  switch (type) {
    case 'evento': return 'E';
    case 'peloton': return 'P';
    case 'aislada': return 'A';
    case 'exde': return 'X';
    case 'cabo': return 'C';
    case 'efectivo': return 'D';
    default: return 'O';
  }
}

function resolveRisk(alert: string, numericRisk: number): OperationalRiskLevel {
  const normalized = alert.toUpperCase();
  if (normalized.includes('CRIT')) return 'critico';
  if (normalized.includes('ALTO')) return 'alto';
  if (normalized.includes('MED')) return 'medio';
  if (normalized.includes('BAJ')) return 'bajo';
  if (numericRisk >= 80) return 'critico';
  if (numericRisk >= 60) return 'alto';
  if (numericRisk >= 35) return 'medio';
  return 'bajo';
}

function riskToLabel(risk: OperationalRiskLevel) {
  switch (risk) {
    case 'critico': return 'Crítico';
    case 'alto': return 'Alto';
    case 'medio': return 'Medio';
    case 'bajo': return 'Bajo';
    default: return 'Bajo';
  }
}

function resolveExde(source: Record<string, unknown>, type: OperationalFeature['type']) {
  if (type === 'exde') {
    return true;
  }
  return ['exde', 'exde_si_no', 'alerta_exde'].some((key) => {
    const value = source[key];
    return typeof value === 'string' && value.toUpperCase().includes('SI');
  });
}

function resolveTimestamp(source: Record<string, unknown>) {
  return pickString(source, ['hop_fecha_hecho', 'fecha', 'fecha_evento', 'fecha_insitop', 'fecha_movimiento'], '-');
}

function formatUbicacion(departamento: string, municipio: string) {
  if (departamento && municipio) {
    return `${municipio}, ${departamento}`;
  }
  return municipio || departamento || 'Sin ubicación';
}

function formatDistance(value: number) {
  if (!value) {
    return '-';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value.toFixed(0)} m`;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }

  if (value && typeof value === 'object') {
    return Object.values(value).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }

  return [];
}

function pickString(source: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return fallback;
}

function pickNumber(source: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function pickNumberOrNull(source: Record<string, unknown>, keys: string[]) {
  const parsed = pickNumber(source, keys, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
