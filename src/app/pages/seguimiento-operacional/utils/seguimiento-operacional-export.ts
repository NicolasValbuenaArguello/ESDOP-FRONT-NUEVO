import tokml from 'tokml';
import {
  OperationalMapFeature,
  OperationalMapMovement,
  OperationalMapRenderModel
} from '../interfaces/seguimiento-operacional-dashboard.interface';

type GeoJsonFeature = {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString';
    coordinates: number[] | number[][];
  };
  properties: Record<string, unknown>;
};

type GeoJsonCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

/**
 * Genera un GeoJSON solo con lo visible en el mapa para mantener
 * consistencia entre exportacion y vista operacional.
 */
export function buildVisibleGeoJson(model: OperationalMapRenderModel): GeoJsonCollection {
  const pointFeatures: GeoJsonFeature[] = model.features.map((item) => pointToFeature(item));
  const movementFeatures: GeoJsonFeature[] = model.movements.map((item) => lineToFeature(item));

  return {
    type: 'FeatureCollection',
    features: [...pointFeatures, ...movementFeatures]
  };
}

export function downloadVisibleGeoJson(model: OperationalMapRenderModel, fileName: string) {
  const geoJson = buildVisibleGeoJson(model);
  downloadBlob(
    JSON.stringify(geoJson, null, 2),
    `${fileName}.geojson`,
    'application/geo+json'
  );
}

export function downloadVisibleKml(model: OperationalMapRenderModel, fileName: string) {
  const geoJson = buildVisibleGeoJson(model);
  const kml = tokml(geoJson as never, {
    name: 'label',
    description: 'popupHtml'
  });
  downloadBlob(kml, `${fileName}.kml`, 'application/vnd.google-earth.kml+xml');
}

export function downloadVisibleCsv(model: OperationalMapRenderModel, fileName: string) {
  const rows = [
    ...model.features.map((item) => ({
      tipo: item.type,
      etiqueta: item.label,
      latitud: item.lat,
      longitud: item.lon,
      color: item.color
    })),
    ...model.movements.map((item) => ({
      tipo: 'movimiento',
      etiqueta: item.id,
      latitud: `${item.startLat} -> ${item.endLat}`,
      longitud: `${item.startLon} -> ${item.endLon}`,
      color: item.color
    }))
  ];

  const headers = ['tipo', 'etiqueta', 'latitud', 'longitud', 'color'];
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(String(row[header as keyof typeof row] ?? ''))).join(',')
    )
  ].join('\n');

  downloadBlob(csv, `${fileName}.csv`, 'text/csv;charset=utf-8');
}

function pointToFeature(item: OperationalMapFeature): GeoJsonFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [item.lon, item.lat]
    },
    properties: {
      id: item.id,
      type: item.type,
      label: item.label,
      color: item.color,
      popupHtml: item.popupHtml
    }
  };
}

function lineToFeature(item: OperationalMapMovement): GeoJsonFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [item.startLon, item.startLat],
        [item.endLon, item.endLat]
      ]
    },
    properties: {
      id: item.id,
      label: item.id,
      color: item.color,
      popupHtml: item.popupHtml
    }
  };
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}
