import * as L from 'leaflet';
import 'leaflet.markercluster';
import {
  OperationalMapFeature,
  OperationalMapMovement,
  OperationalMapRenderModel
} from '../interfaces/seguimiento-operacional-dashboard.interface';

/**
 * Encapsula toda la configuración de Leaflet para que el componente Angular
 * solo le entregue un modelo de render y reciba selecciones.
 */
export class SeguimientoMapLayerManager {
  private readonly canvasRenderer = L.canvas({ padding: 0.4 });
  private readonly focusTargets = new Map<string, L.Layer[]>();
  private readonly markerCluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 11,
    chunkedLoading: true,
    chunkInterval: 120,
    maxClusterRadius: 42,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      const tone = count >= 25 ? 'critico' : count >= 10 ? 'alto' : count >= 4 ? 'medio' : 'bajo';
      return L.divIcon({
        className: `ops-cluster ops-cluster-${tone}`,
        html: `<span>${count}</span>`,
        iconSize: [40, 40]
      });
    }
  });
  private readonly eventLayer = L.layerGroup();
  private readonly movementLayer = L.layerGroup();
  private readonly supportLayer = L.layerGroup();
  private map?: L.Map;

  constructor(private readonly onFeatureSelected: (featureId: string) => void) {}

  initialize(host: HTMLDivElement) {
    if (this.map) {
      return this.map;
    }

    this.map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    }).setView([4.5709, -74.2973], 5);

    this.configurePanes();
    const baseLayers = this.createBaseLayers();
    baseLayers.Calles.addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(this.map);
    L.control.layers(
      baseLayers,
      {
        'Cluster táctico': this.markerCluster,
        'Movimientos': this.movementLayer,
        'Apoyo táctico': this.supportLayer
      },
      { position: 'topright', collapsed: false }
    ).addTo(this.map);

    this.markerCluster.addTo(this.map);
    this.eventLayer.addTo(this.map);
    this.movementLayer.addTo(this.map);
    this.supportLayer.addTo(this.map);

    return this.map;
  }

  render(model: OperationalMapRenderModel) {
    if (!this.map) {
      return;
    }

    this.focusTargets.clear();
    this.markerCluster.clearLayers();
    this.eventLayer.clearLayers();
    this.movementLayer.clearLayers();
    this.supportLayer.clearLayers();

    model.features.forEach((feature) => this.renderFeature(feature, model.selectedFeatureId === feature.id));
    model.movements.forEach((movement) => this.renderMovement(movement));
    this.fitToData(model.selectedFeatureId);
  }

  resize() {
    this.map?.invalidateSize();
  }

  getMapInstance() {
    return this.map;
  }

  destroy() {
    this.map?.remove();
    this.map = undefined;
  }

  private renderFeature(feature: OperationalMapFeature, selected: boolean) {
    if (!this.map) {
      return;
    }

    const layers: L.Layer[] = [];
    const circle = L.circleMarker([feature.lat, feature.lon], {
      pane: feature.pane,
      renderer: this.canvasRenderer,
      radius: feature.type === 'peloton' ? 7 : 6,
      color: feature.color,
      fillColor: feature.color,
      fillOpacity: feature.type === 'peloton' ? 0.85 : 0.92,
      weight: selected ? 3 : 2
    });
    if (feature.type === 'aislada') {
      const ring = L.circle([feature.lat, feature.lon], {
        pane: 'support',
        renderer: this.canvasRenderer,
        radius: 900,
        color: feature.color,
        weight: 1,
        fillOpacity: 0.04
      });
      this.supportLayer.addLayer(ring);
      layers.push(ring);
    }

    const marker = L.marker([feature.lat, feature.lon], {
      pane: feature.pane,
      icon: L.divIcon({
        className: `ops-marker ${selected ? 'is-selected' : ''} ${feature.pulse ? 'is-pulse' : ''}`,
        html: `<span style="--marker-color:${feature.color}">${feature.iconText}</span>`,
        iconSize: selected ? [30, 30] : [26, 26],
        iconAnchor: selected ? [15, 15] : [13, 13]
      })
    });

    marker.bindPopup(feature.popupHtml, { className: 'ops-popup' });
    marker.on('click', () => this.onFeatureSelected(feature.id));

    this.eventLayer.addLayer(circle);
    this.markerCluster.addLayer(marker);
    layers.push(circle, marker);
    this.focusTargets.set(feature.id, layers);
  }

  private renderMovement(movement: OperationalMapMovement) {
    const polyline = L.polyline(
      [
        [movement.startLat, movement.startLon],
        [movement.endLat, movement.endLon]
      ],
      {
        pane: 'movement',
        renderer: this.canvasRenderer,
        color: movement.color,
        weight: movement.weight,
        opacity: 0.88,
        dashArray: '10 8'
      }
    );
    polyline.bindPopup(movement.popupHtml, { className: 'ops-popup' });
    this.movementLayer.addLayer(polyline);
  }

  private fitToData(selectedFeatureId: string | null) {
    if (!this.map) {
      return;
    }

    if (selectedFeatureId) {
      const focus = this.focusTargets.get(selectedFeatureId);
      if (focus?.length) {
        const group = L.featureGroup(focus as L.Layer[]);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds.pad(0.35), { maxZoom: 12, animate: true });
          return;
        }
      }
    }

    const allLayers = [
      ...this.markerCluster.getLayers(),
      ...this.movementLayer.getLayers(),
      ...this.supportLayer.getLayers()
    ];
    if (!allLayers.length) {
      this.map.setView([4.5709, -74.2973], 5);
      return;
    }

    const bounds = L.featureGroup(allLayers as L.Layer[]).getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds.pad(0.2), { maxZoom: 10 });
    }
  }

  private createBaseLayers() {
    return {
      Calles: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }),
      Topografico: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'OpenTopoMap'
      }),
      Satelital: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Esri'
      })
    };
  }

  private configurePanes() {
    if (!this.map) {
      return;
    }
    this.map.createPane('eventos');
    this.map.createPane('pelotones');
    this.map.createPane('aisladas');
    this.map.createPane('exde');
    this.map.createPane('movement');
    this.map.createPane('support');

    this.map.getPane('eventos')!.style.zIndex = '440';
    this.map.getPane('pelotones')!.style.zIndex = '450';
    this.map.getPane('aisladas')!.style.zIndex = '460';
    this.map.getPane('exde')!.style.zIndex = '470';
    this.map.getPane('movement')!.style.zIndex = '430';
    this.map.getPane('support')!.style.zIndex = '420';
  }
}
