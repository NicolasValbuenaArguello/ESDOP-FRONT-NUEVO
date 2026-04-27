


import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import html2canvas from 'html2canvas';
import * as L from 'leaflet';
import 'leaflet-draw';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';

type Evento = {
  id: number;
  categoria: string;
  tipo: string;
  cantidad_total: number;
  puntos: Array<{
    latitud: number;
    longitud: number;
    cantidad: number;
    ubicacion: string;
    division: string;
  }>;
};
type CoordinateSystem = 'decimal' | 'dms';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.css']
})
export class EstadisticasComponent implements AfterViewInit, OnDestroy {
  readonly allTypesToken = '__ALL_TYPES__';

  mostrarPivotModal = false;

  mostrarGraficasModal = false;
  mostrarTablaModal = false;

  // Descargar gráficas como imagen (usa html2canvas)
  async descargarGraficasComoImagen() {
    const el =
      this.document.getElementById('graficas-modal-content') ||
      this.document.querySelector('.popup-modal.graficas-modal');
    if (!el) {
      alert('No se encontró el contenedor de las gráficas.');
      return;
    }
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio > 1 ? 2 : 1
    });
    const link = document.createElement('a');
    link.download = 'graficas.png';
    link.href = canvas.toDataURL();
    link.click();
  }

  // Descargar tabla como CSV
  descargarTablaComoCSV() {
    const tableData = this.getPivotTableData();
    let csv = ['TIPO', ...tableData.divisiones, 'TOTAL'].join(',') + '\n';

    for (const row of tableData.rows) {
      const values = [
        row.tipo,
        ...tableData.divisiones.map((division) => String(row.valores[division] || 0)),
        String(row.total)
      ];
      csv += values.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = 'tabla.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  // Tooltip para gráfica comparativa
  setTooltipPosition(event: MouseEvent) {
    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--tooltip-mouse-x', x + 'px');
    document.documentElement.style.setProperty('--tooltip-mouse-y', y + 'px');
  }
  clearTooltipPosition() {
    document.documentElement.style.setProperty('--tooltip-mouse-x', '50vw');
    document.documentElement.style.setProperty('--tooltip-mouse-y', '0px');
  }

    getPivotTableData() {
      const tipos = this.getTiposActivos();
      const divisiones = Array.from(
        new Set(
          tipos.flatMap((tipo) => (this.puntosPorTipo[tipo.tipo] || []).map((punto) => punto.division))
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const rows = tipos.map((tipo) => {
        const valores: Record<string, number> = {};
        let total = 0;

        for (const division of divisiones) {
          valores[division] = 0;
        }

        for (const punto of this.puntosPorTipo[tipo.tipo] || []) {
          valores[punto.division] = (valores[punto.division] || 0) + punto.cantidad;
          total += punto.cantidad;
        }

        return {
          tipo: tipo.tipo,
          valores,
          total
        };
      });

      const totalGeneral: Record<string, number> = {};
      for (const division of divisiones) {
        totalGeneral[division] = rows.reduce((acc, row) => acc + (row.valores[division] || 0), 0);
      }

      return {
        divisiones,
        rows,
        totalGeneral,
        totalGlobal: rows.reduce((acc, row) => acc + row.total, 0)
      };
    }
  @ViewChild('leafletMap') leafletMapRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mapPanel') mapPanelRef?: ElementRef<HTMLElement>;
  

  sidebarVisible = true;
  textModeEnabled = false;
  isMapFullscreen = false;
  mostrarCoordenadasModal = false;
  mostrarFiltrosModal = false;
  measureModeEnabled = false;
  cursorCoordinates = 'Lat: -- | Lng: --';
  measurementSummary = 'Medicion inactiva';
  coordinateError = '';
  coordinateSystem: CoordinateSystem = 'decimal';
  coordinateForm = { lat: '', lng: '', label: '' };
  coordinateDmsForm = { latDegrees: '', latMinutes: '', latSeconds: '', latHemisphere: 'N', lngDegrees: '', lngMinutes: '', lngSeconds: '', lngHemisphere: 'W', label: '' };
  filtrosForm = { lapsoInicialA: '', lapsoInicialB: '', lapsoFinalA: '', lapsoFinalB: '', subFiltroRegional: '', subFiltroUnidad: '', subFiltroEstado: '', documentosTipo: '', documentosOrigen: '', documentosClasificacion: '' };

  // --- NUEVO: Datos dinámicos de ejemplo ---
  eventos: Evento[] = [];
  categorias: string[] = [];
  tiposPorCategoria: Record<string, { tipo: string; total: number }[]> = {};
  puntosPorTipo: Record<string, Evento['puntos']> = {};
  coloresPorTipo: Record<string, string> = {};
  tipoSeleccionado: string | null = null;
  categoriaSeleccionada: string | null = null;

  // Paleta de colores para tipos
  readonly palette = [
    '#7d0012', '#1b5e20', '#1565c0', '#fbc02d', '#8e24aa', '#00838f', '#e65100', '#c62828', '#2e7d32', '#283593', '#ad1457', '#00695c', '#f9a825', '#4527a0', '#37474f'
  ];

  // --- NUEVO: Barras dinámicas para gráficas ---
  get barrasCategoria() {
    const tipos = this.getTiposActivos();
    const total = tipos.reduce((acc, t) => acc + t.total, 0) || 1;
    return tipos.map(t => ({
      label: t.tipo,
      value: Math.round((t.total / total) * 100),
      color: this.getColorTipo(t.tipo)
    }));
  }

  private map?: L.Map;
  private markerLayer: L.LayerGroup = L.layerGroup();
  private editableLayers: L.FeatureGroup = new L.FeatureGroup();
  private measurementLayer: L.FeatureGroup = new L.FeatureGroup();
  private measurementPoints: L.LatLng[] = [];
  private measurementLine?: L.Polyline;
  private readonly markerResizeHandler = () => {
    this.applyLeafletRuntimePatches();
    this.refreshMarkerIcons();
  };
  private readonly fullscreenChangeHandler = () => {
    const fsEl = (this.document as Document).fullscreenElement;
    this.isMapFullscreen = fsEl === this.mapPanelRef?.nativeElement;
    this.scheduleMapResize();
  };

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  // --- FIN NUEVO ---


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


  // --- NUEVO: Inicialización de datos de ejemplo y helpers ---
  ngOnInit() {
    // Simular fetch de backend
    this.eventos = this.getEventosEjemplo();
    this.categorias = Array.from(new Set(this.eventos.map(e => e.categoria)));
    this.tiposPorCategoria = {};
    this.puntosPorTipo = {};
    this.coloresPorTipo = {};
    let colorIdx = 0;
    for (const cat of this.categorias) {
      const tipos = this.eventos.filter(e => e.categoria === cat).map(e => ({ tipo: e.tipo, total: e.cantidad_total }));
      this.tiposPorCategoria[cat] = tipos;
      for (const t of tipos) {
        this.puntosPorTipo[t.tipo] = this.eventos.find(e => e.tipo === t.tipo)?.puntos || [];
        if (!this.coloresPorTipo[t.tipo]) {
          this.coloresPorTipo[t.tipo] = this.palette[colorIdx % this.palette.length];
          colorIdx++;
        }
      }
    }
    // Selección inicial: primera categoría y tipo
    this.categoriaSeleccionada = this.categorias[0] || null;
    this.tipoSeleccionado = this.allTypesToken;
  }


  setCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
    this.tipoSeleccionado = this.allTypesToken;
    this.renderMarkers();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }


  setTipo(tipo: string) {
    this.tipoSeleccionado = tipo;
    this.renderMarkers();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  getTiposActivos() {
    return this.categoriaSeleccionada ? this.tiposPorCategoria[this.categoriaSeleccionada] || [] : [];
  }

  getPuntosActivos() {
    if (this.tipoSeleccionado === this.allTypesToken) {
      return this.getTiposActivos().flatMap((tipo) =>
        (this.puntosPorTipo[tipo.tipo] || []).map((punto) => ({
          ...punto,
          tipo: tipo.tipo
        }))
      );
    }

    return this.tipoSeleccionado
      ? (this.puntosPorTipo[this.tipoSeleccionado] || []).map((punto) => ({
          ...punto,
          tipo: this.tipoSeleccionado as string
        }))
      : [];
  }

  isShowingAllTypes() {
    return this.tipoSeleccionado === this.allTypesToken;
  }

  getMapExportFileName() {
    const categoria = (this.categoriaSeleccionada || 'estadisticas')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const scope = this.isShowingAllTypes()
      ? 'todos-los-tipos'
      : (this.tipoSeleccionado || 'sin-tipo')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

    return `${categoria}-${scope}.kml`;
  }

  getColorTipo(tipo: string) {
    return this.coloresPorTipo[tipo] || '#7d0012';
  }

  // --- FIN NUEVO ---


  ngAfterViewInit() {
    this.applyLeafletRuntimePatches();
    this.initializeMap();
    this.scheduleMapResize(200);
    (this.document as Document).addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    window.addEventListener('resize', this.markerResizeHandler);
  }

  ngOnDestroy() {
    (this.document as Document).removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    window.removeEventListener('resize', this.markerResizeHandler);
    this.map?.remove();
  }

  private applyLeafletRuntimePatches() {
    this.patchLeafletReadableArea();
    this.setLeafletDefaultIconPaths();
  }

  private patchLeafletReadableArea() {
    try {
      const geometryUtil = (L as any).GeometryUtil;
      if (!geometryUtil) {
        return;
      }

      const original = geometryUtil.readableArea;
      if (typeof original !== 'function') {
        return;
      }

      if ((geometryUtil as any).__esdopPatchedReadableArea) {
        return;
      }

      geometryUtil.readableArea = function (area: number, isMetric: boolean, precisionOrOptions?: any) {
        // eslint-disable-next-line no-unused-vars
        let type: any;

        try {
          return original.apply(this, arguments as any);
        } catch (err) {
          try {
            const areaValue = Number(area) || 0;
            const precision = (precisionOrOptions && precisionOrOptions.precision) || 2;
            const unit = isMetric ? 'm²' : 'ft²';
            return areaValue.toFixed(precision) + ' ' + unit;
          } catch (_ignored) {
            return String(area);
          }
        }
      };

      (geometryUtil as any).__esdopPatchedReadableArea = true;
    } catch (error) {
      // ignore patching failures to keep map boot resilient
    }
  }

  private setLeafletDefaultIconPaths() {
    try {
      const baseEl = (document.querySelector('base') as HTMLBaseElement) || null;
      const baseHref = baseEl?.getAttribute('href') || '/';
      const appBase = new URL(baseHref, window.location.origin);

      const iconRetinaUrl = new URL('assets/leaflet/marker-icon-2x.png', appBase).toString();
      const iconUrl = new URL('assets/leaflet/marker-icon.png', appBase).toString();
      const shadowUrl = new URL('assets/leaflet/marker-shadow.png', appBase).toString();

      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const iconSize = isMobile ? [20, 33] : [25, 41];
      const iconAnchor = isMobile ? [10, 33] : [12, 41];
      const popupAnchor = isMobile ? [1, -28] : [1, -34];
      const shadowSize = isMobile ? [33, 33] : [41, 41];

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
        iconSize,
        iconAnchor,
        popupAnchor,
        shadowSize
      });
    } catch (error) {
      // ignore icon setup failures so the rest of the view keeps working
    }
  }

  private refreshMarkerIcons() {
    if (!this.map) return;
    const refreshMarkerLayer = (group: L.LayerGroup) => group.eachLayer((layer) => {
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

    refreshMarkerLayer(this.markerLayer);
    refreshMarkerLayer(this.editableLayers);
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
    this.scheduleMapResize();
  }

  private scheduleMapResize(delay = 80) {
    const resizeMap = () => {
      this.map?.invalidateSize();
      this.cdr.markForCheck();
    };

    setTimeout(resizeMap, delay);
    setTimeout(resizeMap, delay + 180);
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
      ...this.markerLayer.getLayers(),
      ...this.editableLayers.getLayers(),
      ...this.measurementLayer.getLayers()
    ];

    const placemarks = allLayers
      .map((layer, index) => this.layerToKml(layer, index + 1))
      .filter((placemark): placemark is string => Boolean(placemark));

    const styles = this.buildKmlStyles();

    const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>Mapa operativo</name>\n    ${styles.join('\n    ')}\n    ${placemarks.join('\n    ')}\n  </Document>\n</kml>`;

    const blob = new Blob([kml], {
      type: 'application/vnd.google-earth.kml+xml;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const anchor = (this.document as Document).createElement('a');
    anchor.href = url;
    anchor.download = this.getMapExportFileName();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private layerToKml(layer: L.Layer, index: number) {
    if (layer instanceof L.Circle) {
      return this.circleToKml(layer, index);
    }

    if (layer instanceof L.CircleMarker) {
      const point = layer.getLatLng();
      const label = this.getLayerLabel(layer, `Punto ${index}`);
      const styleId = this.getKmlStyleId(layer);
      const description = this.buildKmlDescription(layer);
      return `<Placemark><name>${this.escapeHtml(label)}</name>${styleId ? `<styleUrl>#${styleId}</styleUrl>` : ''}${description ? `<description><![CDATA[${description}]]></description>` : ''}<Point><coordinates>${point.lng},${point.lat},0</coordinates></Point></Placemark>`;
    }

    if (layer instanceof L.Marker) {
      const point = layer.getLatLng();
      const label = this.getLayerLabel(layer, `Punto ${index}`);
      const styleId = this.getKmlStyleId(layer);
      const description = this.buildKmlDescription(layer);
      return `<Placemark><name>${this.escapeHtml(label)}</name>${styleId ? `<styleUrl>#${styleId}</styleUrl>` : ''}${description ? `<description><![CDATA[${description}]]></description>` : ''}<Point><coordinates>${point.lng},${point.lat},0</coordinates></Point></Placemark>`;
    }

    if (layer instanceof L.Polygon) {
      const rings = layer.getLatLngs();
      const outerRing = this.extractPolygonRing(rings);

      if (!outerRing.length) {
        return null;
      }

      const label = this.getLayerLabel(layer, `Poligono ${index}`);
      const styleId = this.getKmlStyleId(layer);
      const description = this.buildKmlDescription(layer);
      return `<Placemark><name>${this.escapeHtml(label)}</name>${styleId ? `<styleUrl>#${styleId}</styleUrl>` : ''}${description ? `<description><![CDATA[${description}]]></description>` : ''}<Polygon><outerBoundaryIs><LinearRing><coordinates>${this.formatKmlCoordinates(outerRing, true)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
    }

    if (layer instanceof L.Polyline) {
      const points = layer.getLatLngs() as L.LatLng[];

      if (!points.length) {
        return null;
      }

      const label = this.getLayerLabel(layer, `Linea ${index}`);
      const styleId = this.getKmlStyleId(layer);
      const description = this.buildKmlDescription(layer);
      return `<Placemark><name>${this.escapeHtml(label)}</name>${styleId ? `<styleUrl>#${styleId}</styleUrl>` : ''}${description ? `<description><![CDATA[${description}]]></description>` : ''}<LineString><tessellate>1</tessellate><coordinates>${this.formatKmlCoordinates(points)}</coordinates></LineString></Placemark>`;
    }

    return null;
  }

  private circleToKml(circle: L.Circle, index: number) {
    const center = circle.getLatLng();
    const ring = this.buildCircleRing(center, circle.getRadius());
    const label = this.getLayerLabel(circle, `Circulo ${index}`);
    const styleId = this.getKmlStyleId(circle);
    const description = this.buildKmlDescription(circle);
    return `<Placemark><name>${this.escapeHtml(label)}</name>${styleId ? `<styleUrl>#${styleId}</styleUrl>` : ''}${description ? `<description><![CDATA[${description}]]></description>` : ''}<Polygon><outerBoundaryIs><LinearRing><coordinates>${this.formatKmlCoordinates(ring, true)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
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

  private getKmlStyleId(layer: L.Layer) {
    const feature = (layer as L.Layer & {
      feature?: { properties?: { kmlStyleId?: string } };
    }).feature;

    return feature?.properties?.kmlStyleId || null;
  }

  private buildKmlDescription(layer: L.Layer) {
    const feature = (layer as L.Layer & {
      feature?: { properties?: Record<string, unknown> };
    }).feature;
    const properties = feature?.properties || {};

    return Object.entries(properties)
      .filter(([key, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        !['kmlStyleId', 'shapeType', 'label'].includes(key)
      )
      .map(([key, value]) => `<strong>${this.escapeHtml(this.capitalize(key))}:</strong> ${this.escapeHtml(String(value))}`)
      .join('<br>');
  }

  private buildKmlStyles() {
    const styles = new Map<string, string>();

    Object.entries(this.coloresPorTipo).forEach(([tipo, color]) => {
      const styleId = this.getTipoStyleId(tipo);
      styles.set(styleId, this.createKmlStyle(styleId, color));
    });

    styles.set('editable-default', this.createKmlStyle('editable-default', '#7d0012'));
    styles.set('measurement-default', this.createKmlStyle('measurement-default', '#7d0012'));

    return Array.from(styles.values());
  }

  private getTipoStyleId(tipo: string) {
    return `tipo-${tipo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')}`;
  }

  private createKmlStyle(styleId: string, hexColor: string) {
    const color = this.hexToKmlColor(hexColor);
    const colorSoft = this.hexToKmlColor(hexColor, '66');

    return `<Style id="${styleId}"><IconStyle><color>${color}</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle><LineStyle><color>${color}</color><width>3</width></LineStyle><PolyStyle><color>${colorSoft}</color></PolyStyle></Style>`;
  }

  private hexToKmlColor(hexColor: string, alpha = 'ff') {
    const normalized = hexColor.replace('#', '');
    const expanded = normalized.length === 3
      ? normalized.split('').map((char) => char + char).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
    const red = expanded.slice(0, 2);
    const green = expanded.slice(2, 4);
    const blue = expanded.slice(4, 6);

    return `${alpha}${blue}${green}${red}`;
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
    if (!this.map) return;
    this.markerLayer.clearLayers();
    const puntos = this.getPuntosActivos();
    const bounds: L.LatLngTuple[] = [];
    for (const punto of puntos) {
      const latLng: L.LatLngTuple = [punto.latitud, punto.longitud];
      bounds.push(latLng);
      const tipo = 'tipo' in punto ? String(punto.tipo) : this.tipoSeleccionado || 'Tipo';
      const color = this.getColorTipo(tipo);
      const marker = L.circleMarker(latLng, {
        radius: 12,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2
      })
        .bindPopup(
          `<strong>${this.escapeHtml(tipo)}</strong><br>
          <b>Cantidad:</b> ${punto.cantidad}<br>
          <b>Ubicación:</b> ${this.escapeHtml(punto.ubicacion)}<br>
          <b>División:</b> ${this.escapeHtml(punto.division)}`,
          { closeButton: false, offset: [0, -8] }
        );

      (marker as L.CircleMarker & { feature?: Record<string, unknown> }).feature = {
        type: 'Feature',
        properties: {
          label: tipo,
          tipo,
          cantidad: punto.cantidad,
          ubicacion: punto.ubicacion,
          division: punto.division,
          kmlStyleId: this.getTipoStyleId(tipo),
          shapeType: 'json-marker'
        },
        geometry: {
          type: 'Point',
          coordinates: [punto.longitud, punto.latitud]
        }
      };

      marker.addTo(this.markerLayer);
    }
    if (bounds.length) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
    }
  }

  // --- Datos de ejemplo ---
  getEventosEjemplo(): Evento[] {
    return [
      { id: 1, categoria: 'Afectación al enemigo', tipo: 'Capturas', cantidad_total: 12, puntos: [ { latitud: 7.1193, longitud: -73.1227, cantidad: 3, ubicacion: 'Antioquia', division: 'DIV07' }, { latitud: 6.8000, longitud: -73.2000, cantidad: 4, ubicacion: 'Santander', division: 'DIV02' }, { latitud: 7.2000, longitud: -72.9000, cantidad: 5, ubicacion: 'Norte de Santander', division: 'DIV30' } ] },
      { id: 2, categoria: 'Afectación al enemigo', tipo: 'Presentaciones', cantidad_total: 8, puntos: [ { latitud: 4.1420, longitud: -73.6266, cantidad: 3, ubicacion: 'Meta', division: 'DIV04' }, { latitud: 2.5700, longitud: -72.6400, cantidad: 5, ubicacion: 'Guaviare', division: 'DIV22' } ] },
      { id: 3, categoria: 'Afectación al enemigo', tipo: 'Sometimientos', cantidad_total: 6, puntos: [ { latitud: 1.2892, longitud: -77.3579, cantidad: 2, ubicacion: 'Nariño', division: 'DIV03' }, { latitud: 2.4448, longitud: -76.6147, cantidad: 4, ubicacion: 'Cauca', division: 'DIV08' } ] },
      { id: 4, categoria: 'Afectación al narcotráfico', tipo: 'Laboratorios destruidos', cantidad_total: 5, puntos: [ { latitud: 0.4350, longitud: -76.5270, cantidad: 2, ubicacion: 'Putumayo', division: 'DIV06' }, { latitud: 1.6144, longitud: -75.6062, cantidad: 3, ubicacion: 'Caquetá', division: 'DIV12' } ] },
      { id: 5, categoria: 'Afectación al narcotráfico', tipo: 'Incautación de cocaína', cantidad_total: 220, puntos: [ { latitud: 3.4516, longitud: -76.5320, cantidad: 120, ubicacion: 'Valle del Cauca', division: 'DIV03' }, { latitud: 8.0847, longitud: -72.8000, cantidad: 100, ubicacion: 'Norte de Santander', division: 'DIV30' } ] },
      { id: 6, categoria: 'Afectación al narcotráfico', tipo: 'Incautación de marihuana', cantidad_total: 180, puntos: [ { latitud: 2.4448, longitud: -76.6147, cantidad: 80, ubicacion: 'Cauca', division: 'DIV08' }, { latitud: 3.8000, longitud: -75.9000, cantidad: 100, ubicacion: 'Huila', division: 'DIV05' } ] },
      { id: 7, categoria: 'Afectación minería ilegal', tipo: 'Capturas', cantidad_total: 9, puntos: [ { latitud: 5.6947, longitud: -76.6610, cantidad: 5, ubicacion: 'Chocó', division: 'DIV15' }, { latitud: 6.2442, longitud: -75.5812, cantidad: 4, ubicacion: 'Antioquia', division: 'DIV07' } ] },
      { id: 8, categoria: 'Afectación minería ilegal', tipo: 'UPM (Unidades de Producción Minera)', cantidad_total: 7, puntos: [ { latitud: 8.6704, longitud: -74.0300, cantidad: 3, ubicacion: 'Bolívar', division: 'DIV01' }, { latitud: 7.5000, longitud: -74.5000, cantidad: 4, ubicacion: 'Córdoba', division: 'DIV11' } ] },
      { id: 9, categoria: 'Afectación minería ilegal', tipo: 'Motores incautados', cantidad_total: 11, puntos: [ { latitud: 5.6900, longitud: -76.6500, cantidad: 6, ubicacion: 'Chocó', division: 'DIV15' }, { latitud: 6.5000, longitud: -74.0000, cantidad: 5, ubicacion: 'Antioquia', division: 'DIV07' } ] },
      { id: 10, categoria: 'Afectación propias tropas', tipo: 'Heridos', cantidad_total: 5, puntos: [ { latitud: 7.0847, longitud: -70.7591, cantidad: 3, ubicacion: 'Arauca', division: 'DIV18' }, { latitud: 2.5729, longitud: -72.6459, cantidad: 2, ubicacion: 'Guaviare', division: 'DIV22' } ] },
      { id: 11, categoria: 'Afectación propias tropas', tipo: 'Asesinados', cantidad_total: 3, puntos: [ { latitud: 1.5000, longitud: -75.5000, cantidad: 1, ubicacion: 'Caquetá', division: 'DIV12' }, { latitud: 7.0000, longitud: -70.7000, cantidad: 2, ubicacion: 'Arauca', division: 'DIV18' } ] }
    ];
  }



  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    setTimeout(() => this.map?.invalidateSize(), 0);
  }
}
