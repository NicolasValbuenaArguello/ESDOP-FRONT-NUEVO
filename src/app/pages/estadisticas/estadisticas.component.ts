import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-draw';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';

type TabKey = 'filtros' | 'afectaciones' | 'narcotrafico' | 'mineria';
type CoordinateSystem = 'decimal' | 'dms';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.css']
})
export class EstadisticasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('leafletMap') leafletMapRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mapPanel') mapPanelRef?: ElementRef<HTMLElement>;
  

  sidebarVisible = true;
  activeTab: TabKey = 'filtros';
  textModeEnabled = false;
  isMapFullscreen = false;
  mostrarCoordenadasModal = false;
  mostrarFiltrosModal = false;
  measureModeEnabled = false;
  cursorCoordinates = 'Lat: -- | Lng: --';
  measurementSummary = 'Medicion inactiva';
  coordinateError = '';
  coordinateSystem: CoordinateSystem = 'decimal';
  coordinateForm = {
    lat: '',
    lng: '',
    label: ''
  };
  coordinateDmsForm = {
    latDegrees: '',
    latMinutes: '',
    latSeconds: '',
    latHemisphere: 'N',
    lngDegrees: '',
    lngMinutes: '',
    lngSeconds: '',
    lngHemisphere: 'W',
    label: ''
  };
  filtrosForm = {
    lapsoInicialA: '',
    lapsoInicialB: '',
    lapsoFinalA: '',
    lapsoFinalB: '',
    subFiltroRegional: '',
    subFiltroUnidad: '',
    subFiltroEstado: '',
    documentosTipo: '',
    documentosOrigen: '',
    documentosClasificacion: ''
  };

  private map?: L.Map;
  private markerLayer: L.LayerGroup = L.layerGroup();
  private editableLayers: L.FeatureGroup = new L.FeatureGroup();
  private measurementLayer: L.FeatureGroup = new L.FeatureGroup();
  private measurementPoints: L.LatLng[] = [];
  private measurementLine?: L.Polyline;
  private readonly fullscreenChangeHandler = () => {
    const fsEl = (this.document as Document).fullscreenElement;
    this.isMapFullscreen = fsEl === this.mapPanelRef?.nativeElement;
    setTimeout(() => this.map?.invalidateSize(), 80);
  };

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  readonly tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'filtros', label: 'Filtros' },
    { key: 'afectaciones', label: 'Afectaciones a la Amenaza' },
    { key: 'narcotrafico', label: 'Narcotrafico' },
    { key: 'mineria', label: 'Mineria Ilegal' }
  ];

  readonly sideCards: Record<TabKey, Array<{ title: string; value: string; detail: string }>> = {
    filtros: [
      { title: 'Cobertura', value: '32', detail: 'Municipios priorizados' },
      { title: 'Ventanas', value: '7', detail: 'Escenarios configurados' },
      { title: 'Alertas', value: '14', detail: 'Cruces pendientes' }
    ],
    afectaciones: [
      { title: 'Eventos', value: '128', detail: 'Registros en seguimiento' },
      { title: 'Criticos', value: '19', detail: 'Afectaciones con alta severidad' },
      { title: 'Tendencia', value: '+8%', detail: 'Comparado con el ultimo corte' }
    ],
    narcotrafico: [
      { title: 'Rutas', value: '11', detail: 'Corredores identificados' },
      { title: 'Puntos', value: '46', detail: 'Nodos operacionales mapeados' },
      { title: 'Incidencia', value: 'Alta', detail: 'Actividad concentrada al suroccidente' }
    ],
    mineria: [
      { title: 'Frentes', value: '23', detail: 'Zonas con extraccion ilegal' },
      { title: 'Impacto', value: '61%', detail: 'Area con riesgo ambiental' },
      { title: 'Control', value: '9', detail: 'Operaciones articuladas' }
    ]
  };

  readonly chartBars: Record<TabKey, Array<{ label: string; value: number }>> = {
    filtros: [
      { label: 'Norte', value: 42 },
      { label: 'Centro', value: 66 },
      { label: 'Sur', value: 58 }
    ],
    afectaciones: [
      { label: 'Amenaza A', value: 78 },
      { label: 'Amenaza B', value: 54 },
      { label: 'Amenaza C', value: 31 }
    ],
    narcotrafico: [
      { label: 'Corredor 1', value: 74 },
      { label: 'Corredor 2', value: 63 },
      { label: 'Corredor 3', value: 47 }
    ],
    mineria: [
      { label: 'Frente 1', value: 51 },
      { label: 'Frente 2', value: 68 },
      { label: 'Frente 3', value: 39 }
    ]
  };

  readonly markers: Record<TabKey, Array<{ lat: number; lng: number; label: string }>> = {
    filtros: [
      { lat: 10.9685, lng: -74.7813, label: 'Filtro Norte' },
      { lat: 4.711, lng: -74.0721, label: 'Filtro Central' },
      { lat: 1.2136, lng: -77.2811, label: 'Filtro Sur' }
    ],
    afectaciones: [
      { lat: 7.8891, lng: -72.4967, label: 'Afectacion 01' },
      { lat: 3.4516, lng: -76.532, label: 'Afectacion 02' },
      { lat: 2.4448, lng: -76.6147, label: 'Afectacion 03' }
    ],
    narcotrafico: [
      { lat: 6.2518, lng: -77.403, label: 'Ruta Pacifico' },
      { lat: 5.0689, lng: -75.5174, label: 'Ruta Andina' },
      { lat: -0.2299, lng: -74.861, label: 'Ruta Amazonia' }
    ],
    mineria: [
      { lat: 8.5847, lng: -73.0948, label: 'Bloque Norte' },
      { lat: 5.6947, lng: -74.517, label: 'Bloque Central' },
      { lat: 2.9386, lng: -75.2809, label: 'Bloque Sur' }
    ]
  };

  readonly opcionesSubFiltros = {
    regionales: ['Norte', 'Centro', 'Sur', 'Pacifico'],
    unidades: ['Unidad Alfa', 'Unidad Bravo', 'Unidad Charlie', 'Unidad Delta'],
    estados: ['Activo', 'En revision', 'Pendiente', 'Cerrado']
  };

  readonly opcionesDocumentos = {
    tipos: ['Informe', 'Acta', 'Oficio', 'Memorando'],
    origenes: ['Interno', 'Externo', 'Territorial', 'Judicial'],
    clasificaciones: ['Reservado', 'Publico', 'Confidencial', 'Uso interno']
  };

  get currentCards() {
    return this.sideCards[this.activeTab];
  }

  get currentBars() {
    return this.chartBars[this.activeTab];
  }

  get currentMarkers() {
    return this.markers[this.activeTab];
  }

  ngAfterViewInit() {
    this.initializeMap();
    (this.document as Document).addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    // Listen for main.ts dispatch when Leaflet icon paths are resolved
    window.addEventListener('leaflet-icons-ready', this.onLeafletIconsReady as EventListener);
  }

  ngOnDestroy() {
    (this.document as Document).removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    window.removeEventListener('leaflet-icons-ready', this.onLeafletIconsReady as EventListener);
    this.map?.remove();
  }

  private onLeafletIconsReady = (ev: Event) => {
    // When the icon URLs are ready, ensure existing markers refresh their icons.
    // Delay slightly to ensure map/layers are initialized.
    setTimeout(() => this.refreshMarkerIcons(), 50);
  };

  private refreshMarkerIcons() {
    if (!this.map) return;
    // Iterate all layers and replace icon for non-divIcon markers
    this.markerLayer.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const icon = (layer as L.Marker).options.icon as any;
        // If it's a divIcon we skip
        if (icon && icon.options && icon.options.className && icon.options.className.includes('stats-map-pin')) {
          return;
        }

        // Force the marker to use the default icon (which now points to assets)
        try {
          const currentLatLng = (layer as L.Marker).getLatLng();
          const popup = (layer as L.Marker).getPopup();
          (layer as L.Marker).setIcon(new L.Icon.Default());
          (layer as L.Marker).setLatLng(currentLatLng);
          if (popup) {
            const content = popup.getContent();
            if (content !== undefined && content !== null) {
              (layer as L.Marker).bindPopup(content as any, { closeButton: false, offset: [0, -8] });
            }
          }
        } catch (e) {
          // ignore per-layer errors
        }
      }
    });
  }

  
  private initializeMap() {
    const host = this.leafletMapRef?.nativeElement;

    if (!host || this.map) {
      return;
    }

    // create the map and attach event listeners outside Angular change detection
    this.ngZone.runOutsideAngular(() => {
      this.map = L.map(host, {
        zoomControl: false,
        attributionControl: true
      }).setView([4.5709, -74.2973], 5);

      L.control.zoom({ position: 'bottomright' }).addTo(this.map!);
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(this.map!);

      const baseLayers = this.createBaseLayers();
      baseLayers['Calles'].addTo(this.map!);

      L.control.layers(baseLayers, {
        'Puntos operativos': this.markerLayer,
        'Elementos creados': this.editableLayers,
        'Medicion': this.measurementLayer
      }, {
        position: 'topright',
        collapsed: false
      }).addTo(this.map!);

      this.map!.attributionControl.setPosition('bottomleft');

      this.markerLayer.addTo(this.map!);
      this.editableLayers.addTo(this.map!);
      this.measurementLayer.addTo(this.map!);
      this.configureDrawingTools();
      this.configureMapEvents();
      this.renderMarkers();

      // ensure map renders correctly after view changes
      setTimeout(() => this.ngZone.run(() => this.map?.invalidateSize()), 0);
    });
  }

  private configureDrawingTools() {
    if (!this.map) {
      return;
    }

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: this.editableLayers,
        remove: true
      },
      draw: {
        polygon: {},
        polyline: {},
        rectangle: {},
        circle: {},
        marker: {},
        circlemarker: false
      }
    });

    this.map.addControl(drawControl);
  }

  private configureMapEvents() {
    if (!this.map) {
      return;
    }

    // draw created event: run inside Angular because it mutates component state
    this.map.on('draw:created', (event: any) => {
      const layer = (event as L.DrawEvents.Created).layer as L.Layer;
      const layerType = (event as any).layerType || 'layer';
      this.ngZone.run(() => {
        this.decorateLayer(layer, layerType);
        this.editableLayers.addLayer(layer);
        this.cdr.markForCheck();
      });
    });

    // mousemove can fire frequently - update view model inside Angular zone but minimize CD by markForCheck
    this.map.on('mousemove', (event: L.LeafletMouseEvent) => {
      this.ngZone.run(() => {
        this.cursorCoordinates = this.formatLatLngDms(event.latlng.lat, event.latlng.lng);
        this.cdr.markForCheck();
      });
    });

    // click handler may trigger UI prompts and marker creation
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.ngZone.run(() => {
        if (!this.textModeEnabled) {
          if (this.measureModeEnabled) {
            this.addMeasurementPoint(event.latlng);
            this.cdr.markForCheck();
          }

          return;
        }

        const text = (this.document.defaultView || window).prompt('Texto para ubicar en el mapa');
        this.textModeEnabled = false;

        if (text?.trim()) {
          this.createTextMarker(event.latlng, text.trim());
        }
      });
    });
  }

  private addMeasurementPoint(latlng: L.LatLng) {
    this.measurementPoints = [...this.measurementPoints, latlng];

    L.circleMarker(latlng, {
      radius: 6,
      color: '#7d0012',
      weight: 2,
      fillColor: '#ffd166',
      fillOpacity: 0.95
    }).addTo(this.measurementLayer);

    if (this.measurementLine) {
      this.measurementLayer.removeLayer(this.measurementLine);
    }

    this.measurementLine = L.polyline(this.measurementPoints, {
      color: '#7d0012',
      weight: 3,
      dashArray: '10 8'
    }).addTo(this.measurementLayer);

    const totalDistance = this.getMeasurementDistance();
    this.measurementSummary = this.measurementPoints.length > 1
      ? `Distancia total: ${this.formatDistance(totalDistance)} · Puntos: ${this.measurementPoints.length}`
      : 'Medicion iniciada. Selecciona otro punto.';

    const lastPoint = this.measurementPoints[this.measurementPoints.length - 1];
    L.popup({ closeButton: false, autoClose: true, offset: [0, -10] })
      .setLatLng(lastPoint)
      .setContent(`<strong>${this.escapeHtml(this.measurementSummary)}</strong>`)
      .openOn(this.map!);
  }

  private createBaseLayers(): Record<string, L.TileLayer> {
    return {
      Calles: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }),
      Topografico: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
      }),
      Claro: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }),
      Satelital: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri'
      })
    };
  }

  private decorateLayer(layer: L.Layer, layerType: string) {
    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      layer.bindPopup(
        `<strong>Circulo</strong><br>Radio: ${layer.getRadius().toFixed(1)} m<br>${this.formatLatLngDms(center.lat, center.lng)}`
      );
      return;
    }

    if (layer instanceof L.Marker) {
      const latlng = layer.getLatLng();
      layer.bindPopup(`<strong>Punto</strong><br>${this.formatLatLngDms(latlng.lat, latlng.lng)}`);
      return;
    }

    if ('bindPopup' in layer && typeof layer.bindPopup === 'function') {
      layer.bindPopup(`<strong>${this.capitalize(layerType)}</strong>`);
    }
  }

  toggleTextMode() {
    this.textModeEnabled = !this.textModeEnabled;

    if (this.textModeEnabled) {
      this.measureModeEnabled = false;
    }
  }

  toggleMeasureMode() {
    this.measureModeEnabled = !this.measureModeEnabled;

    if (this.measureModeEnabled) {
      this.textModeEnabled = false;
      this.measurementSummary = this.measurementPoints.length > 1
        ? `Distancia total: ${this.formatDistance(this.getMeasurementDistance())} · Puntos: ${this.measurementPoints.length}`
        : 'Haz clic sobre el mapa para comenzar a medir';
      return;
    }

    this.measurementSummary = this.measurementPoints.length > 1
      ? `Distancia total: ${this.formatDistance(this.getMeasurementDistance())} · Puntos: ${this.measurementPoints.length}`
      : 'Medicion inactiva';
  }

  clearMeasurement() {
    this.measurementPoints = [];
    this.measurementLine = undefined;
    this.measurementLayer.clearLayers();
    this.measureModeEnabled = false;
    this.measurementSummary = 'Medicion inactiva';
  }

  async toggleFullscreen() {
    const panel = this.mapPanelRef?.nativeElement;

    if (!panel) {
      return;
    }

    if (document.fullscreenElement === panel) {
      await document.exitFullscreen();
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    if (panel.requestFullscreen) {
      await panel.requestFullscreen();
      return;
    }

    this.isMapFullscreen = !this.isMapFullscreen;
    setTimeout(() => this.map?.invalidateSize(), 80);
  }

  abrirCoordenadasModal() {
    this.coordinateError = '';
    this.mostrarCoordenadasModal = true;
  }

  abrirFiltrosModal() {
    this.mostrarFiltrosModal = true;
  }

  cerrarCoordenadasModal() {
    this.coordinateError = '';
    this.mostrarCoordenadasModal = false;
  }

  cerrarFiltrosModal() {
    this.mostrarFiltrosModal = false;
  }

  cambiarSistemaCoordenadas(system: CoordinateSystem) {
    this.coordinateSystem = system;
    this.coordinateError = '';
  }

  plotCoordinate() {
    if (!this.map) {
      return;
    }

    const parsedCoordinates = this.resolveCoordinateInput();

    if (!parsedCoordinates) {
      return;
    }

    const { lat, lng, label } = parsedCoordinates;

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.coordinateError = 'Las coordenadas estan fuera del rango permitido';
      return;
    }

    const latlng = L.latLng(lat, lng);

    const marker = L.marker(latlng).bindPopup(
      `<strong>${this.escapeHtml(label)}</strong><br>${this.formatLatLngDms(lat, lng)}`
    );

    (marker as L.Marker & { feature?: Record<string, unknown> }).feature = {
      type: 'Feature',
      properties: {
        shapeType: 'coordinate-marker',
        label
      },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    };

    this.editableLayers.addLayer(marker);
    this.map.flyTo(latlng, Math.max(this.map.getZoom(), 10));
    marker.openPopup();

    this.coordinateForm = {
      lat: '',
      lng: '',
      label: ''
    };

    this.coordinateDmsForm = {
      latDegrees: '',
      latMinutes: '',
      latSeconds: '',
      latHemisphere: 'N',
      lngDegrees: '',
      lngMinutes: '',
      lngSeconds: '',
      lngHemisphere: 'W',
      label: ''
    };

    this.coordinateError = '';
    this.mostrarCoordenadasModal = false;
  }

  private resolveCoordinateInput() {
    if (this.coordinateSystem === 'decimal') {
      const lat = Number(this.coordinateForm.lat);
      const lng = Number(this.coordinateForm.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        this.coordinateError = 'Ingresa una latitud y longitud validas en grados decimales';
        return null;
      }

      return {
        lat,
        lng,
        label: this.coordinateForm.label.trim() || 'Punto por coordenadas'
      };
    }

    const lat = this.dmsToDecimal(
      this.coordinateDmsForm.latDegrees,
      this.coordinateDmsForm.latMinutes,
      this.coordinateDmsForm.latSeconds,
      this.coordinateDmsForm.latHemisphere,
      'latitud'
    );
    const lng = this.dmsToDecimal(
      this.coordinateDmsForm.lngDegrees,
      this.coordinateDmsForm.lngMinutes,
      this.coordinateDmsForm.lngSeconds,
      this.coordinateDmsForm.lngHemisphere,
      'longitud'
    );

    if (lat === null || lng === null) {
      return null;
    }

    return {
      lat,
      lng,
      label: this.coordinateDmsForm.label.trim() || 'Punto por coordenadas'
    };
  }

  private dmsToDecimal(
    degreesValue: string,
    minutesValue: string,
    secondsValue: string,
    hemisphere: string,
    axisLabel: string
  ) {
    const degrees = Number(degreesValue);
    const minutes = Number(minutesValue || '0');
    const seconds = Number(secondsValue || '0');

    if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      this.coordinateError = `Ingresa ${axisLabel} valida en grados, minutos y segundos`;
      return null;
    }

    if (degrees < 0 || minutes < 0 || seconds < 0 || minutes >= 60 || seconds >= 60) {
      this.coordinateError = `El formato GMS de ${axisLabel} no es valido`;
      return null;
    }

    const decimal = degrees + (minutes / 60) + (seconds / 3600);
    const sign = hemisphere === 'S' || hemisphere === 'W' ? -1 : 1;
    return decimal * sign;
  }

  exportDrawnData() {
    const allLayers: L.Layer[] = [
      ...this.editableLayers.getLayers(),
      ...this.measurementLayer.getLayers()
    ];

    const placemarks = allLayers
      .map((layer, index) => this.layerToKml(layer, index + 1))
      .filter((placemark): placemark is string => Boolean(placemark));

    const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>Mapa operativo</name>\n    ${placemarks.join('\n    ')}\n  </Document>\n</kml>`;

    const blob = new Blob([kml], {
      type: 'application/vnd.google-earth.kml+xml;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const anchor = (this.document as Document).createElement('a');
    anchor.href = url;
    anchor.download = 'mapa-operativo.kml';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private layerToKml(layer: L.Layer, index: number) {
    if (layer instanceof L.Circle) {
      return this.circleToKml(layer, index);
    }

    if (layer instanceof L.Marker) {
      const point = layer.getLatLng();
      const label = this.getLayerLabel(layer, `Punto ${index}`);
      return `<Placemark><name>${this.escapeHtml(label)}</name><Point><coordinates>${point.lng},${point.lat},0</coordinates></Point></Placemark>`;
    }

    if (layer instanceof L.Polygon) {
      const rings = layer.getLatLngs();
      const outerRing = this.extractPolygonRing(rings);

      if (!outerRing.length) {
        return null;
      }

      const label = this.getLayerLabel(layer, `Poligono ${index}`);
      return `<Placemark><name>${this.escapeHtml(label)}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${this.formatKmlCoordinates(outerRing, true)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
    }

    if (layer instanceof L.Polyline) {
      const points = layer.getLatLngs() as L.LatLng[];

      if (!points.length) {
        return null;
      }

      const label = this.getLayerLabel(layer, `Linea ${index}`);
      return `<Placemark><name>${this.escapeHtml(label)}</name><LineString><tessellate>1</tessellate><coordinates>${this.formatKmlCoordinates(points)}</coordinates></LineString></Placemark>`;
    }

    return null;
  }

  private circleToKml(circle: L.Circle, index: number) {
    const center = circle.getLatLng();
    const ring = this.buildCircleRing(center, circle.getRadius());
    const label = this.getLayerLabel(circle, `Circulo ${index}`);
    return `<Placemark><name>${this.escapeHtml(label)}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${this.formatKmlCoordinates(ring, true)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
  }

  private buildCircleRing(center: L.LatLng, radiusInMeters: number) {
    const points: L.LatLng[] = [];
    const earthRadius = 6378137;
    const angularDistance = radiusInMeters / earthRadius;
    const latRad = center.lat * Math.PI / 180;
    const lngRad = center.lng * Math.PI / 180;

    for (let step = 0; step <= 36; step += 1) {
      const bearing = (step * 10) * Math.PI / 180;
      const lat = Math.asin(
        Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
      );
      const lng = lngRad + Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat)
      );

      points.push(L.latLng(lat * 180 / Math.PI, lng * 180 / Math.PI));
    }

    return points;
  }

  private extractPolygonRing(rings: L.LatLng[] | L.LatLng[][] | L.LatLng[][][]) {
    const first = Array.isArray(rings) ? rings[0] : [];

    if (!Array.isArray(first)) {
      return rings as L.LatLng[];
    }

    const nested = first[0];
    return Array.isArray(nested) ? first[0] as L.LatLng[] : first as L.LatLng[];
  }

  private formatKmlCoordinates(points: L.LatLng[], closeRing = false) {
    const normalized = closeRing && points.length
      ? [...points, points[0]]
      : points;

    return normalized.map((point) => `${point.lng},${point.lat},0`).join(' ');
  }

  private getLayerLabel(layer: L.Layer, fallback: string) {
    const feature = (layer as L.Layer & {
      feature?: { properties?: { label?: string; shapeType?: string } };
    }).feature;

    return feature?.properties?.label || feature?.properties?.shapeType || fallback;
  }

  private layerToFeature(layer: L.Layer) {
    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      return {
        type: 'Feature',
        properties: {
          shapeType: 'circle',
          radius: layer.getRadius()
        },
        geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat]
        }
      };
    }

    if (layer instanceof L.Marker) {
      const customFeature = (layer as L.Marker & { feature?: Record<string, unknown> }).feature;

      if (customFeature) {
        return customFeature;
      }

      const point = layer.getLatLng();
      return {
        type: 'Feature',
        properties: {
          shapeType: 'marker'
        },
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        }
      };
    }

    if ('toGeoJSON' in layer && typeof layer.toGeoJSON === 'function') {
      const geoJson = layer.toGeoJSON() as { properties?: Record<string, unknown> } & Record<string, unknown>;
      geoJson.properties = {
        ...(geoJson.properties || {}),
        shapeType: this.detectShapeType(layer)
      };
      return geoJson;
    }

    return null;
  }

  private detectShapeType(layer: L.Layer) {
    if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
      return 'polygon';
    }

    if (layer instanceof L.Rectangle) {
      return 'rectangle';
    }

    if (layer instanceof L.Polyline) {
      return 'polyline';
    }

    return 'layer';
  }

  private createTextMarker(latlng: L.LatLng, label: string) {
    const safeLabel = this.escapeHtml(label);
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'map-text-label',
        html: `<span>${safeLabel}</span>`,
        iconAnchor: [0, 18]
      })
    }).bindPopup(`<strong>Texto</strong><br>${safeLabel}`);

    (marker as L.Marker & { feature?: Record<string, unknown> }).feature = {
      type: 'Feature',
      properties: {
        shapeType: 'text',
        label
      },
      geometry: {
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat]
      }
    };

    this.editableLayers.addLayer(marker);
    marker.openPopup();
  }

  private formatLatLngDms(lat: number, lng: number) {
    return `Lat: ${this.toDms(lat, 'lat')} | Lng: ${this.toDms(lng, 'lng')}`;
  }

  private getMeasurementDistance() {
    if (!this.map || this.measurementPoints.length < 2) {
      return 0;
    }

    return this.measurementPoints.slice(1).reduce((total, currentPoint, index) => {
      const previousPoint = this.measurementPoints[index];
      return total + this.map!.distance(previousPoint, currentPoint);
    }, 0);
  }

  private formatDistance(distanceInMeters: number) {
    if (distanceInMeters >= 1000) {
      return `${(distanceInMeters / 1000).toFixed(2)} km`;
    }

    return `${distanceInMeters.toFixed(1)} m`;
  }

  private toDms(value: number, axis: 'lat' | 'lng') {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    const hemisphere = axis === 'lat'
      ? value >= 0 ? 'N' : 'S'
      : value >= 0 ? 'E' : 'W';

    return `${degrees}° ${minutes}' ${seconds}" ${hemisphere}`;
  }

  private capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private renderMarkers() {
    if (!this.map) {
      return;
    }

    this.markerLayer.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    for (const marker of this.currentMarkers) {
      const latLng: L.LatLngTuple = [marker.lat, marker.lng];
      bounds.push(latLng);

      L.marker(latLng, {
        icon: L.divIcon({
          className: 'stats-map-pin',
          html: '<span></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      })
        .bindPopup(`<strong>${marker.label}</strong>`, { closeButton: false, offset: [0, -8] })
        .addTo(this.markerLayer);
    }

    if (bounds.length) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
    }
  }

  setTab(tab: TabKey) {
    this.activeTab = tab;
    this.renderMarkers();

    if (tab === 'filtros') {
      this.abrirFiltrosModal();
    }
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    setTimeout(() => this.map?.invalidateSize(), 0);
  }
}