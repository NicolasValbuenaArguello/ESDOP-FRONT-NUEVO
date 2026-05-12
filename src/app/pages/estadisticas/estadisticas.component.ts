


// ...existing code...




import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule, Validators } from '@angular/forms';
import html2canvas from 'html2canvas';
// @ts-ignore
import leafletImage from 'leaflet-image';
import * as L from 'leaflet';
import 'leaflet-draw';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService, PermisoAcceso } from '../../services/auth';
import { UnidadesTreeService } from '../../services/unidades-tree.service';

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

type TipoDashboard = {
  key: string;
  tipo: string;
  total: number;
};

type MapaPunto = {
  latitud: number;
  longitud: number;
  cantidad: number;
  ubicacion: string;
  division: string;
  tipo: string;
  tipoKey: string;
  cantidadRegistros: number;
  latitudRender: number;
  longitudRender: number;
};

type CoordinateSystem = 'decimal' | 'dms';

type MapLegendItem = {
  label: string;
  color: string;
  kind?: 'dot' | 'line';
};

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.css']
})
export class EstadisticasComponent implements AfterViewInit, OnDestroy {
  // --- CAMBIO: Operaciones cargadas desde unidades-tree.service ---
  operaciones: string[] = [];
  // tiposOperacion eliminado, usar solo opcionesSubFiltros.tipoOperaciones

  /**
   * CAMBIO: Cargar operaciones desde unidades-tree.service y mostrarlas en consola
   */
  cargarOperacionesDesdeServicio() {
    this.operaciones = this.unidadesTreeService.obtenerNombresOperacionDesdeStorage();
    // Mostrar en consola para depuración
    console.log('Operaciones cargadas:', this.operaciones);
  }
  // cargarTiposOperacionDesdeServicio eliminado, usar solo opcionesSubFiltros.tipoOperaciones
  /**
   * Devuelve el texto del apoyo seleccionado según apoyosUnificados.
   */
  getTextoApoyoSeleccionado(): string {
    if (!this.apoyoSeleccionado || typeof this.apoyoSeleccionado !== 'object') return '';
    const apoyoId = this.apoyoSeleccionado.id;
    if (!apoyoId) return '';
    const apoyo = this.apoyosUnificados.find(a => a.id === apoyoId);
    return apoyo ? apoyo.texto : '';
  }

    /**
   * Devuelve documento Selecionado de infraestructura.
   */
  getTextoDocumentoInfraSeleccionado(): string {
    if (!this.documentoInfraSeleccionado || typeof this.documentoInfraSeleccionado !== 'object') return '';
    const documentoId = this.documentoInfraSeleccionado.id;
    if (!documentoId) return '';
    const documento = this.documentosInfraestructura.find(d => d.id === documentoId);
    return documento ? documento.texto : '';
  }


  // El método ngOnInit debe estar solo una vez. Integramos la carga de operaciones en el ngOnInit principal.
  // ...existing code...


  // --- SUBREGIONES ---
  mostrarSubregionesModal = false;
  mostrarApoyosModal = false;
  subregiones: any[] = [];
  subregionSeleccionada: any = null;
  departamentoSeleccionado: any = null;


  apoyosUnificados = [
    // Apoyos de unidad ya estructurados
    { id: '', valor: '', texto: 'Sin Apoyo' },
    { id: 'hop_accion_davaa', valor: 'SI', texto: 'Apoyo DAVAA' },
    { id: 'hop_apoyo_conat', valor: 'SI', texto: 'Apoyo CONAT' },
    { id: 'hop_apoyo_blica', valor: 'SI', texto: 'Apoyo BLICA' },
    // Apoyos originales como objetos
    { id: 'hop_accion_ccoes', valor: 'SI', texto: 'Apoyo CCOES' },
    { id: 'hop_apoyo_aereo', valor: 'MISIÓN ALFA', texto: 'Apoyo AÉREO MISIÓN ALFA' },
    { id: 'hop_apoyo_aereo', valor: 'MISIÓN BETA', texto: 'Apoyo AÉREO MISIÓN BETA' },
    { id: 'hop_apoyo_aereo', valor: 'MISIÓN CHARLIE', texto: 'Apoyo AÉREO MISIÓN CHARLIE' },
    { id: 'hop_apoyo_art', valor: 'SI', texto: 'Apoyo ART' },
    { id: 'hop_apoyo_bafur', valor: 'SI', texto: 'Apoyo BAFUR' },
    { id: 'hop_apoyo_brcmi', valor: 'SI', texto: 'Apoyo BRCMI' },
    { id: 'hop_apoyo_brcom', valor: 'SI', texto: 'Apoyo BRCOM' },
    { id: 'hop_apoyo_divfe', valor: 'SI', texto: 'Apoyo DIVFE' },
    { id: 'hop_apoyo_exde', valor: 'SI', texto: 'Apoyo EXDE' },
    { id: 'hop_apoyo_fudat', valor: 'SI', texto: 'Apoyo FUDAT' },
    { id: 'hop_apoyo_groic', valor: 'SI', texto: 'Apoyo GROIC' },
    { id: 'hop_apoyo_pj', valor: 'SI', texto: 'Apoyo PJ' },
    { id: 'hop_asalto_aereo', valor: 'SI', texto: 'Apoyo Asalto AÉREO' },
    { id: 'hop_apoyo_coeej', valor: 'SI', texto: 'Apoyo COEEJ' },
    { id: 'hop_apoyo_brcmi', valor: 'SI', texto: 'UNIDAD BRCMI' }

  ];
 documentosInfraestructura= [
    { id: 'infraestructuraCede3', valor: 'infraestructuraCede3', texto: 'Infraestructura Diseño CEDE3' },
    { id: 'infraestructuraDirop', valor: 'infraestructuraDirop', texto: 'Infraestructura Diseño DIROP' },
    { id: 'infraestructuraEjc', valor: 'infraestructuraEjc', texto: 'Infraestructura Diseño EJC' },
 ];


  apoyoSeleccionado: {
    id: string;
    valor: string;
    texto: string;
  } | null = null;
documentoInfraSeleccionado: {
    id: string;
    valor: string;
    texto: string;
  } | null = null;


  abrirSubregionesModal() {
    this.mostrarSubregionesModal = true;
    this.subregionSeleccionada = null;
  }

  cerrarSubregionesModal() {
    this.mostrarSubregionesModal = false;
    this.subregionSeleccionada = null;
  }


  seleccionarSubregion(sub: any) {
    this.subregionSeleccionada = sub;
    this.departamentoSeleccionado = null;
  }

  seleccionarDepartamento(dep: any) {
    this.departamentoSeleccionado = dep;
  }


  // Permisos CRUD de esta vista:
  // - `puede_ver` controla resumenes, tablas, graficas y exportaciones
  // - `puede_crear` controla herramientas que agregan elementos al mapa
  // - `puede_editar` controla filtros y actualizacion del dashboard
  // - `puede_eliminar` controla acciones de limpieza/remocion

  // Alternativa: exportar el mapa como imagen usando html2canvas (captura todo lo visible)
  async exportarMapaComoImagenHtml2Canvas() {
    // Captura el contenedor padre que incluye todos los overlays y controles
    const mapCaptureSurface = document.querySelector('.map-capture-surface') as HTMLElement;
    if (!mapCaptureSurface) {
      alert('No se encontró el contenedor principal del mapa.');
      return;
    }
    try {
      this.exportingMapImage = true;
      this.cdr.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 600));
      const canvas = await html2canvas(mapCaptureSurface, {
        backgroundColor: '#fffaf8',
        scale: window.devicePixelRatio > 1 ? 2 : 1,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `${this.getMapExportFileName().replace(/\.kml$/i, '')}_todo.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      this.exportingMapImage = false;
      this.cdr.detectChanges();
    }
  }
  @ViewChild('convencionesModalRef', { static: false }) convencionesModalRef!: ElementRef;
  public tipoMapaActivo: string = 'Calles';
  // Descargar la ventana de convenciones como imagen
  async descargarConvencionesComoImagen() {
    const modal = this.convencionesModalRef?.nativeElement as HTMLElement | undefined;
    if (!modal) {
      alert('No se encontró la ventana de convenciones.');
      return;
    }
    const canvas = await html2canvas(modal, {
      backgroundColor: '#fff',
      scale: window.devicePixelRatio > 1 ? 2 : 1,
      useCORS: true,
      logging: false
    });
    const link = document.createElement('a');
    link.download = 'convenciones.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
  // Cambiar tipo de mapa activo (debe llamarse desde el handler de cambio de capa base)
  public onTipoMapaChange(tipo: string) {
    this.tipoMapaActivo = tipo;
  }
  public mostrarConvencionesModal = false;
  readonly allTypesToken = '__ALL_TYPES__';

  private api = `${environment.apiBase}${environment.services?.dashboard ?? '/dashboard'}`;
  private api_2 = `${environment.apiBase}${environment.services?.generar_pptx ?? '/generar_pptx'}`;
  mostrarPivotModal = false;

  mostrarGraficasModal = false;
  mostrarTablaModal = false;
  mostrarResumenModal = false;
  mostrarSubFiltrosModal = false;
  mostrarDocumentosModal = false;
  mostrarSelectorUnidadesModal = false;
  mostrarSelectordocumentosInfraestructuraModal = false;
  mostrarSelectorLugarModal = false;
  mostrarSelectorEnemigoModal = false;
  exportingMapImage = false;
  mostrarSelectorOperacionalModal = false;

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


  async descargarMapaComoImagen() {
    // Exportar usando leaflet-image para capturar el mapa y los puntos nativos de Leaflet
    if (!this.map) {
      alert('No se encontró el mapa de Leaflet.');
      return;
    }
    try {
      this.exportingMapImage = true;
      this.cdr.detectChanges();
      this.map.invalidateSize();
      await new Promise((resolve) => setTimeout(resolve, 400));
      await new Promise<void>((resolve, reject) => {
        leafletImage(this.map as L.Map, (err: any, canvas: HTMLCanvasElement) => {
          if (err || !canvas) {
            reject(err || new Error('No se pudo capturar el mapa base.'));
            return;
          }
          const link = document.createElement('a');
          link.download = `${this.getMapExportFileName().replace(/\.kml$/i, '')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          resolve();
        });
      });
    } finally {
      this.exportingMapImage = false;
      this.cdr.detectChanges();
    }
  }

  // Fallback: solo overlays (sin mapa base)
  async descargarMapaComoImagenSoloOverlays() {
    const captureSurface = this.mapCaptureSurfaceRef?.nativeElement;
    if (!captureSurface) {
      alert('No se encontró el contenedor del mapa.');
      return;
    }
    try {
      const overlayCanvas = await html2canvas(captureSurface, {
        backgroundColor: '#fffaf8',
        scale: window.devicePixelRatio > 1 ? 2 : 1,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `${this.getMapExportFileName().replace(/\.kml$/i, '')}_solo_overlays.png`;
      link.href = overlayCanvas.toDataURL('image/png');
      link.click();
      alert('El mapa base no pudo ser exportado por restricciones de CORS. Solo se exportaron los puntos y la leyenda.');
    } catch (error) {
      alert('No fue posible generar la imagen del mapa.');
    }
  }

  // Tooltip para gráfica comparativa

  getPivotTableData(): {
    divisiones: string[];
    rows: Array<{ tipo: string; valores: Record<string, number>; total: number }>;
    totalGeneral: Record<string, number>;
    totalGlobal: number;
  } {
    const tipos: Array<{ key: string; tipo: string; total: number }> = this.getTiposActivos();
    const divisiones: string[] = Array.from(
      new Set(
        tipos.flatMap((tipo: { key: string }) => (this.puntosPorTipo[tipo.key] || []).map((punto: { division: string }) => punto.division))
      )
    ).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

    const rows: Array<{ tipo: string; valores: Record<string, number>; total: number }> = tipos.map((tipo: { key: string; tipo: string; total: number }) => {
      const valores: Record<string, number> = {};
      let total = 0;

      for (const division of divisiones) {
        valores[division] = 0;
      }

      for (const punto of (this.puntosPorTipo[tipo.key] || []) as Array<{ division: string; cantidad: number }>) {
        valores[punto.division] = (valores[punto.division] || 0) + punto.cantidad;
      }

      total = tipo.total;

      return {
        tipo: tipo.tipo,
        valores,
        total
      };
    });

    const totalGeneral: Record<string, number> = {};
    for (const division of divisiones) {
      totalGeneral[division] = rows.reduce((acc: number, row) => acc + (row.valores[division] || 0), 0);
    }

    return {
      divisiones,
      rows,
      totalGeneral,
      totalGlobal: rows.reduce((acc: number, row) => acc + row.total, 0)
    };
  }
  @ViewChild('leafletMap') leafletMapRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mapPanel') mapPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('mapCaptureSurface') mapCaptureSurfaceRef?: ElementRef<HTMLDivElement>;

  permisoEstadisticas: PermisoAcceso | null = null;

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
  filtrosForm = {
    lapsoInicialA: '',
    lapsoInicialB: '',
    lapsoFinalA: '',
    lapsoFinalB: '',
    subFiltroRegional: '',
    subFiltroDivisionesFt: '',
    subFiltroDivisiones: '',
    subFiltroBrigadas: [] as string[],
    subFiltroBatallones: [] as string[],
    subFiltroUt: [] as string[],
    subFiltroDepartamento: [] as string[],
    subFiltroMunicipio: [] as string[],
    subFiltroEnemigo: [] as string[],
    subFiltroEnemigoEstructura: [] as string[],
    subFiltroOperaciones: '',
    subFiltroEstado: '',
    documentosTipo: '',
    documentosOrigen: '',
    documentosClasificacion: '',
    tiposOperacion: '',
    hechos: '',
    estrategiasAfecta: '',
    resultadosGaulas: '',
    resultadosCoordinados: '',
    resultadosConjuntos: ''
  };

  // --- NUEVO: Datos dinámicos de ejemplo ---
  eventos: Evento[] = [];
  categorias: string[] = [];
  tiposPorCategoria: Record<string, TipoDashboard[]> = {};
  puntosPorTipo: Record<string, Evento['puntos']> = {};
  coloresPorTipo: Record<string, string> = {};
  tipoSeleccionado: string | null = null;
  categoriaSeleccionada: string | null = null;
  cargandoDashboard = false;
  dashboardStatusMsg = '';

  descargadoDocumentoStatusMsg = '';
  descargandoDocumento = false;

  // Paleta de colores para tipos
  readonly palette = [
    '#7d0012', '#1b5e20', '#1565c0', '#fbc02d', '#8e24aa', '#00838f', '#e65100', '#c62828', '#2e7d32', '#283593', '#ad1457', '#00695c', '#f9a825', '#4527a0', '#37474f'
  ];

  // --- NUEVO: Barras dinámicas para gráficas ---
  get barrasCategoria() {
    const tipos = this.getTiposActivos();
    const total = tipos.reduce((acc, t) => acc + t.total, 0) || 1;
    return tipos.map(t => ({
      key: t.key,
      label: t.tipo,
      value: Math.round((t.total / total) * 100),
      color: this.getColorTipo(t.key)
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
    @Inject(DOCUMENT) private readonly document: Document,
    private http: HttpClient,
    private auth: AuthService,
    private unidadesTreeService: UnidadesTreeService
  ) { }

  // --- FIN NUEVO ---

  subFiltroDivisiones = '';
  readonly opcionesSubFiltros = {
    divisiones: [] as string[],
    divisiones_ft: [] as string[],
    brigadas: [] as string[],
    batallones: [] as string[],
    uts: [] as string[],
    departamentos: [] as string[],
    municipios: [] as string[],
    enemigos: [] as string[],
    enemigosEstructura: [] as string[],
    estados: ['Activo', 'En revision', 'Pendiente', 'Cerrado'],
    operaciones: [] as string[],
    tiposOperacion: [] as string[],
    hechos: [] as string[],
    estrategiasAfecta: [] as string[],
    resultadosGaulas: ['Gaulas', 'No Gaulas'],
    resultadosCoordinados: ['SI', 'NO'],
    resultadosConjuntos: ['SI', 'NO']
  };
  private mapaEnemigoEstructura: Record<string, string[]> = {};

  readonly opcionesDocumentos = {
    tipos: ['Informe', 'Acta', 'Oficio', 'Memorando'],
    origenes: ['Interno', 'Externo', 'Territorial', 'Judicial'],
    clasificaciones: ['Reservado', 'Publico', 'Confidencial', 'Uso interno']
  };



  // --- NUEVO: Inicialización de datos desde backend ---
  ngOnInit() {
    // Se toma el permiso de la ruta principal para aplicar acciones internas
    // del componente sin depender del sidebar.
    this.permisoEstadisticas = this.auth.obtenerPermisoRuta('/estadisticas');
    this.cargarOpcionesSubFiltrosDesdeUsuario();
    this.cargarOperacionesDesdeServicio(); // <-- Cargar operaciones aquí
    // Siempre cargar tipos de operación desde localStorage al iniciar
    this.opcionesSubFiltros.tiposOperacion = this.unidadesTreeService.obtenerNombresTipoOperacionDesdeStorage();
    this.opcionesSubFiltros.hechos = this.unidadesTreeService.obtenerNombresHechoDesdeStorage();
    this.opcionesSubFiltros.estrategiasAfecta = this.unidadesTreeService.obtenerNombresEstrategiaAfectaDesdeStorage();
    this.cargandoDashboard = false;
    this.dashboardStatusMsg = 'Selecciona las fechas y consulta el dashboard.';
    // Cargar subregiones dinámicamente desde el backend/localStorage
    this.subregiones = this.auth.obtenerSubRegionesUsuario();
    // Obtener datos reales del backend
    this.http.get<any>(`${this.api}`).pipe(
      catchError(error => {
        console.error('Error al obtener eventos:', error);
        return throwError(() => error);
      })
    ).subscribe({
      next: (resp) => {
        // Espera que resp tenga la forma { eventos: Evento[] } o similar
        let eventosRaw = resp?.eventos;
        // LOG de depuración: mostrar respuesta completa y eventosRaw
        console.log('Respuesta backend:', resp);
        console.log('eventosRaw:', eventosRaw);
        if (!Array.isArray(eventosRaw)) {
          // Si el backend devuelve un objeto, intenta convertirlo a array
          if (eventosRaw && typeof eventosRaw === 'object') {
            eventosRaw = Object.values(eventosRaw);
          } else {
            eventosRaw = [];
          }
        }
        // Extraer y asignar los tipos de operación únicos desde backend
        let tiposOperacion = Array.from(
          new Set((eventosRaw as any[]).map(ev => ev.tipo_operacion).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        // Si no hay tipos desde backend, usar los del localStorage
        if (!tiposOperacion.length) {
          tiposOperacion = this.unidadesTreeService.obtenerNombresTipoOperacionDesdeStorage();
        }
        this.opcionesSubFiltros.tiposOperacion = tiposOperacion;
        // LOG de depuración: mostrar tiposOperacion y opcionesSubFiltros.tiposOperacion
        console.log('tiposOperacion extraídos:', tiposOperacion);
        console.log('opcionesSubFiltros.tiposOperacion:', this.opcionesSubFiltros.tiposOperacion);

        this.eventos = eventosRaw.map((ev: any) => {
          // El backend anida puntos por división, hay que aplanar y normalizar tipos
          let puntos: any[] = [];
          if (Array.isArray(ev.puntos)) {
            for (const div of ev.puntos) {
              if (Array.isArray(div.puntos)) {
                puntos = puntos.concat(div.puntos.map((p: any) => ({
                  ...p,
                  latitud: typeof p.latitud === 'string' ? parseFloat(p.latitud) : p.latitud,
                  longitud: typeof p.longitud === 'string' ? parseFloat(p.longitud) : p.longitud,
                  cantidad: typeof p.cantidad === 'string' ? parseFloat(p.cantidad) : p.cantidad,
                  ubicacion: p.ubicacion,
                  division: p.division
                })));
              }
            }
          }
          return {
            id: ev.id,
            categoria: ev.categoria,
            tipo: ev.tipo,
            cantidad_total: typeof ev.cantidad_total === 'string' ? parseFloat(ev.cantidad_total) : ev.cantidad_total,
            puntos
          };
        });
        // Organizar categorías y tipos igual que el ejemplo
        this.categorias = Array.from(new Set(this.eventos.map(e => e.categoria)));
        this.tiposPorCategoria = {};
        this.puntosPorTipo = {};
        this.coloresPorTipo = {};
        let colorIdx = 0;
        for (const cat of this.categorias) {
          const tipos = this.eventos
            .filter(e => e.categoria === cat)
            .map(e => ({ key: this.buildTipoKey(e.categoria, e.tipo), tipo: e.tipo, total: e.cantidad_total }));
          this.tiposPorCategoria[cat] = tipos;
          for (const t of tipos) {
            this.puntosPorTipo[t.key] = this.eventos.find(e => this.buildTipoKey(e.categoria, e.tipo) === t.key)?.puntos || [];
            if (!this.coloresPorTipo[t.key]) {
              this.coloresPorTipo[t.key] = this.palette[colorIdx % this.palette.length];
              colorIdx++;
            }
          }
        }
        // Selección inicial: primera categoría y tipo
        this.categoriaSeleccionada = this.categorias[0] || null;
        this.tipoSeleccionado = this.allTypesToken;
        // Renderizar marcadores y refrescar vista
        setTimeout(() => {
          this.renderMarkers();
          this.cdr.markForCheck();
        }, 0);
        this.dashboardStatusMsg = this.eventos.length
          ? `Dashboard cargado. ${this.eventos.length} tipos disponibles.`
          : 'No hay datos para mostrar.';
        this.cargandoDashboard = false;
      },
      error: (err) => {
        this.dashboardStatusMsg = 'No fue posible cargar el dashboard.';
        this.cargandoDashboard = false;
      }
    });
  }


  setCategoria(cat: string) {
    if (!this.puedeVerEstadisticasCrud) {
      return;
    }

    this.categoriaSeleccionada = cat;
    this.tipoSeleccionado = this.allTypesToken;
    this.renderMarkers();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }


  setTipo(tipoKey: string) {
    if (!this.puedeVerEstadisticasCrud) {
      return;
    }

    this.tipoSeleccionado = tipoKey;
    this.renderMarkers();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  getTiposActivos() {
    return this.categoriaSeleccionada ? this.tiposPorCategoria[this.categoriaSeleccionada] || [] : [];
  }

  getPuntosActivos() {
    if (this.tipoSeleccionado === this.allTypesToken) {
      return this.getTiposActivos().flatMap((tipo) =>
        (this.puntosPorTipo[tipo.key] || []).map((punto) => ({
          ...punto,
          tipo: tipo.tipo,
          tipoKey: tipo.key
        }))
      );
    }

    return this.tipoSeleccionado
      ? (this.puntosPorTipo[this.tipoSeleccionado] || []).map((punto) => ({
        ...punto,
        tipo: this.getTiposActivos().find((tipo) => tipo.key === this.tipoSeleccionado)?.tipo || 'Tipo',
        tipoKey: this.tipoSeleccionado as string
      }))
      : [];
  }

  get mapLegendItems(): MapLegendItem[] {
    const items: MapLegendItem[] = [];

    if (this.map?.hasLayer(this.markerLayer)) {
      const tipos = this.tipoSeleccionado && this.tipoSeleccionado !== this.allTypesToken
        ? this.getTiposActivos().filter((tipo) => tipo.key === this.tipoSeleccionado)
        : this.getTiposActivos();

      for (const tipo of tipos) {
        items.push({
          label: tipo.tipo,
          color: this.getColorTipo(tipo.key),
          kind: 'dot'
        });
      }
    }

    if (this.map?.hasLayer(this.editableLayers) && this.editableLayers.getLayers().length) {
      items.push({
        label: 'Elementos creados',
        color: '#37474f',
        kind: 'line'
      });
    }

    if (this.map?.hasLayer(this.measurementLayer) && this.measurementLayer.getLayers().length) {
      items.push({
        label: 'Medición',
        color: '#e65100',
        kind: 'line'
      });
    }

    return items;
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
    const tipoActivo = this.getTiposActivos().find((tipo) => tipo.key === this.tipoSeleccionado)?.tipo;
    const scope = this.isShowingAllTypes()
      ? 'todos-los-tipos'
      : (tipoActivo || 'sin-tipo')
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
    // Escuchar el cambio de base layer para actualizar tipoMapaActivo
    if (this.map) {
      this.map.on('baselayerchange', (e: any) => {
        this.ngZone.run(() => {
          this.tipoMapaActivo = e.name;
        });
      });
    }
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
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: 'anonymous'
      }),
      Topografico: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
        crossOrigin: 'anonymous'
      }),
      Claro: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        crossOrigin: 'anonymous'
      }),
      Satelital: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri',
        crossOrigin: 'anonymous'
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

  abrirSubFiltrosModal() {
    this.mostrarSubFiltrosModal = true;
  }
  abrirDocumentosFiltrosModal() {
    this.mostrarDocumentosModal = true;
  }
  cerrarDocumentosFiltrosModal() {
    this.mostrarDocumentosModal = false;
  }
  abrirSelectorUnidadesModal() {
    this.mostrarSelectorUnidadesModal = true;
  }
  abrirInfraestructuraModal() {
    this.mostrarSelectordocumentosInfraestructuraModal = true;
  }
  cerrarInfraestructuraModal() {
    this.mostrarSelectordocumentosInfraestructuraModal = false;
  }
  abrirSelectorLugarModal() {
    this.mostrarSelectorLugarModal = true;
  }

  abrirSelectorEnemigoModal() {
    this.actualizarOpcionesEnemigo();
    this.cdr.markForCheck();
    this.mostrarSelectorEnemigoModal = true;
  }
  abrirSelectorOperacionalModal() {
    this.actualizarOpcionesSubFiltrosOperativos();
    this.cdr.markForCheck();
    this.mostrarSelectorOperacionalModal = true;
  }
  cerrarSelectorOperacionalModal() {
    this.mostrarSelectorOperacionalModal = false;
  }
  abrirApoyosModal() {
    this.mostrarApoyosModal = true;
  }
  cerrarApoyosModal() {
    this.mostrarApoyosModal = false;
  }
  cerrarCoordenadasModal() {
    this.coordinateError = '';
    this.mostrarCoordenadasModal = false;
  }

  cerrarFiltrosModal() {
    this.mostrarFiltrosModal = false;
  }

  cerrarSubFiltrosModal() {
    this.mostrarSubFiltrosModal = false;
    this.mostrarSelectorUnidadesModal = false;
    this.mostrarSelectorLugarModal = false;
    this.mostrarSelectorEnemigoModal = false;
  }
 cerrarSelectorDocumentosModal() {
    this.mostrarDocumentosModal = false;
  }
  cerrarSelectorUnidadesModal() {
    this.mostrarSelectorUnidadesModal = false;
  }

  cerrarSelectorLugarModal() {
    this.mostrarSelectorLugarModal = false;
  }

  cerrarSelectorEnemigoModal() {
    this.mostrarSelectorEnemigoModal = false;
  }
  cerrarSelectorSubRegionesModal() {
    this.mostrarSubregionesModal = false;
  }
  limpiarSubFiltros() {
    this.filtrosForm.subFiltroRegional = '';
    this.filtrosForm.subFiltroDivisionesFt = '';
    this.filtrosForm.subFiltroDivisiones = '';
    this.filtrosForm.subFiltroBrigadas = [];
    this.filtrosForm.subFiltroUt = [];
    this.filtrosForm.subFiltroDepartamento = [];
    this.filtrosForm.subFiltroMunicipio = [];
    this.filtrosForm.subFiltroEnemigo = [];
    this.filtrosForm.subFiltroEnemigoEstructura = [];
    this.filtrosForm.subFiltroEstado = '';
    // Limpiar subregión y departamento seleccionado
    this.subregionSeleccionada = null;
    this.departamentoSeleccionado = null;
    this.actualizarOpcionesSubFiltrosOperativos();
    this.actualizarOpcionesLugar();
    this.actualizarOpcionesEnemigo();
    this.apoyoSeleccionado = null;
    this.filtrosForm.subFiltroOperaciones = '';
    this.filtrosForm.tiposOperacion = '';
    this.filtrosForm.hechos = '';
    this.filtrosForm.estrategiasAfecta = '';
    this.filtrosForm.resultadosGaulas = '';
    this.filtrosForm.resultadosCoordinados = '';
    this.filtrosForm.resultadosConjuntos = '';

  }
  limpiarDocumentos() {

 
    this.documentoInfraSeleccionado = null;


  }
  private cargarOpcionesSubFiltrosDesdeUsuario() {
    const registros = this.unidadesTreeService.normalizarRegistros(this.auth.obtenerUnidadesUsuario());
    const divisionesFt = registros.map((item) => item.agr_div);

    this.opcionesSubFiltros.divisiones_ft = Array.from(new Set(divisionesFt)).sort((a, b) => a.localeCompare(b));
    this.actualizarOpcionesSubFiltrosOperativos();
    this.actualizarOpcionesLugar();
    this.actualizarOpcionesEnemigo();

    // OPERACIONES: Obtener el catálogo plano de operaciones igual que enemigo
    this.opcionesSubFiltros.operaciones = this.obtenerOperacionesUsuario();
  }

  /**
   * Devuelve el catálogo plano de operaciones del usuario, igual que enemigo
   */
  obtenerOperacionesUsuario(): string[] {
    // Se puede ajustar el storageKey si es diferente
    return this.obtenerCatalogoPlanoDesdeStorage(['operacion'], ['operacion', 'operación', 'nombre', 'valor', 'descripcion']);
  }

  onSubFiltroDivisionFtChange() {
    // Cuando cambia el padre raiz, se reinicia toda su rama hija.
    this.filtrosForm.subFiltroDivisiones = '';
    this.filtrosForm.subFiltroBrigadas = [];
    this.filtrosForm.subFiltroUt = [];
    this.actualizarOpcionesSubFiltrosOperativos();
  }

  onSubFiltroDivisionChange() {
    // Cuando cambia la division, brigadas y UT deben recalcularse desde cero.
    this.filtrosForm.subFiltroBrigadas = [];
    this.filtrosForm.subFiltroUt = [];
    this.actualizarOpcionesSubFiltrosOperativos();
  }


  onSubFiltroBrigadasChange() {
    // Las UT y batallones siempre dependen del conjunto actual de brigadas seleccionadas.
    this.filtrosForm.subFiltroUt = [];
    this.filtrosForm.subFiltroBatallones = [];
    this.actualizarOpcionesSubFiltrosOperativos();
  }

  onSubFiltroBatallonesChange() {
    // Si necesitas lógica adicional al cambiar batallones, agrégala aquí.
    // Por ahora, solo se actualiza el filtro.
  }

  onSubFiltroUtChange() {
    this.actualizarOpcionesSubFiltrosOperativos();
  }

  onSubFiltroDepartamentoChange() {
    this.filtrosForm.subFiltroMunicipio = [];
    this.actualizarOpcionesLugar();
  }

  onSubFiltroMunicipioChange() {
    this.actualizarOpcionesLugar();
  }

  onSubFiltroEnemigoChange() {
    this.filtrosForm.subFiltroEnemigoEstructura = [];
    this.actualizarOpcionesEnemigo();
    this.sincronizarSeleccionEnemigo();
  }

  onSubFiltroEnemigoEstructuraChange() {
    this.sincronizarSeleccionEnemigoEstructura();
  }

  private actualizarOpcionesSubFiltrosOperativos() {
    // Cascada operativa:
    // agr_div (Divisiones FT) -> division -> brigada[] -> batallon[] -> unidad[]
    const registros = this.unidadesTreeService.normalizarRegistros(this.auth.obtenerUnidadesUsuario());
    const divisionFtSeleccionada = this.filtrosForm.subFiltroDivisionesFt;

    const registrosPorDivisionFt = divisionFtSeleccionada
      ? registros.filter((item) => item.agr_div === divisionFtSeleccionada)
      : [];

    this.opcionesSubFiltros.divisiones = divisionFtSeleccionada
      ? Array.from(new Set(registrosPorDivisionFt.map((item) => item.division))).sort((a, b) => a.localeCompare(b))
      : [];

    if (
      this.filtrosForm.subFiltroDivisiones &&
      !this.opcionesSubFiltros.divisiones.includes(this.filtrosForm.subFiltroDivisiones)
    ) {
      this.filtrosForm.subFiltroDivisiones = '';
    }

    const divisionSeleccionada = this.filtrosForm.subFiltroDivisiones;
    const registrosPorDivision = divisionSeleccionada
      ? registrosPorDivisionFt.filter((item) => item.division === divisionSeleccionada)
      : [];

    this.opcionesSubFiltros.brigadas = divisionSeleccionada
      ? Array.from(new Set(registrosPorDivision.map((item) => item.brigada))).sort((a, b) => a.localeCompare(b))
      : [];

    // Mantiene solo las brigadas todavia validas dentro del padre seleccionado.
    this.filtrosForm.subFiltroBrigadas = this.filtrosForm.subFiltroBrigadas
      .filter((brigada) => this.opcionesSubFiltros.brigadas.includes(brigada));

    const brigadasSeleccionadas = this.filtrosForm.subFiltroBrigadas;
    const registrosFiltrados = brigadasSeleccionadas.length
      ? registrosPorDivision.filter((item) => brigadasSeleccionadas.includes(item.brigada))
      : [];

    // Batallones se calcula como la union de unidades hijas de todas las brigadas seleccionadas.
    this.opcionesSubFiltros.batallones = brigadasSeleccionadas.length
      ? Array.from(new Set(registrosFiltrados.map((item) => item.unidad))).sort((a, b) => a.localeCompare(b))
      : [];

    // Mantiene solo los batallones que siguen perteneciendo a las brigadas activas.
    this.filtrosForm.subFiltroBatallones = this.filtrosForm.subFiltroBatallones
      .filter((batallon) => this.opcionesSubFiltros.batallones.includes(batallon));

    // UT se calcula como la union de unidades hijas de todas las brigadas seleccionadas.
    this.opcionesSubFiltros.uts = brigadasSeleccionadas.length
      ? Array.from(new Set(registrosFiltrados.map((item) => item.unidad))).sort((a, b) => a.localeCompare(b))
      : [];

    // Mantiene solo las UT que siguen perteneciendo a las brigadas activas.
    this.filtrosForm.subFiltroUt = this.filtrosForm.subFiltroUt
      .filter((ut) => this.opcionesSubFiltros.uts.includes(ut));
  }

  private actualizarOpcionesLugar() {
    // Cascada geografica:
    // dpto[] -> mpio[]
    const registros = this.unidadesTreeService.normalizarRegistros(this.auth.obtenerUnidadesUsuario());

    this.opcionesSubFiltros.departamentos = Array.from(
      new Set(registros.map((item) => item.dpto))
    ).sort((a, b) => a.localeCompare(b));

    this.filtrosForm.subFiltroDepartamento = this.filtrosForm.subFiltroDepartamento
      .filter((dpto) => this.opcionesSubFiltros.departamentos.includes(dpto));

    const departamentosSeleccionados = this.filtrosForm.subFiltroDepartamento;
    const registrosPorDepartamento = departamentosSeleccionados.length
      ? registros.filter((item) => departamentosSeleccionados.includes(item.dpto))
      : [];

    this.opcionesSubFiltros.municipios = departamentosSeleccionados.length
      ? Array.from(new Set(registrosPorDepartamento.map((item) => item.mpio))).sort((a, b) => a.localeCompare(b))
      : [];

    this.filtrosForm.subFiltroMunicipio = this.filtrosForm.subFiltroMunicipio
      .filter((mpio) => this.opcionesSubFiltros.municipios.includes(mpio));
  }

  private actualizarOpcionesEnemigo() {
    // Cascada operativa:
    // enemigo[] -> enemigo_estructura[]
    const enemigosUsuario = this.auth.obtenerEnemigoUsuario();
    this.mapaEnemigoEstructura = this.unidadesTreeService.obtenerMapaEnemigoEstructura(enemigosUsuario);

    this.opcionesSubFiltros.enemigos = Object.keys(this.mapaEnemigoEstructura).sort((a, b) => a.localeCompare(b));

    this.filtrosForm.subFiltroEnemigo = this.filtrosForm.subFiltroEnemigo
      .filter((enemigo) => this.opcionesSubFiltros.enemigos.includes(enemigo));

    const enemigosSeleccionados = this.filtrosForm.subFiltroEnemigo;
    const estructuras = enemigosSeleccionados.length
      ? enemigosSeleccionados.flatMap((enemigo) => this.mapaEnemigoEstructura[enemigo] || [])
      : [];

    this.opcionesSubFiltros.enemigosEstructura = Array.from(new Set(estructuras))
      .sort((a, b) => a.localeCompare(b));

    this.sincronizarSeleccionEnemigo();
    this.sincronizarSeleccionEnemigoEstructura();
  }

  private sincronizarSeleccionEnemigo() {
    this.filtrosForm.subFiltroEnemigo = this.filtrosForm.subFiltroEnemigo
      .filter((enemigo) => this.opcionesSubFiltros.enemigos.includes(enemigo));
  }

  private sincronizarSeleccionEnemigoEstructura() {
    this.filtrosForm.subFiltroEnemigoEstructura = this.filtrosForm.subFiltroEnemigoEstructura
      .filter((estructura) => this.opcionesSubFiltros.enemigosEstructura.includes(estructura));
  }

  private obtenerCatalogoPlanoDesdeStorage(storageKeys: string[], fieldAliases: string[]) {
    const valores = new Set<string>();

    for (const storageKey of storageKeys) {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        this.recolectarValoresCatalogo(parsed, fieldAliases, valores);
      } catch {
        // Ignora payloads no validos y continua con la siguiente llave.
      }
    }

    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }

  private extraerValoresCatalogo(source: unknown, fieldAliases: string[]) {
    const valores = new Set<string>();
    this.recolectarValoresCatalogo(source, fieldAliases, valores);
    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }

  private construirOpcionesCatalogo(sources: string[][]) {
    const valores = new Set<string>();

    for (const source of sources) {
      for (const item of source) {
        const value = typeof item === 'string' ? item.trim() : '';
        if (value) {
          valores.add(value);
        }
      }
    }

    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }

  private recolectarValoresCatalogo(source: unknown, fieldAliases: string[], output: Set<string>, visited = new Set<unknown>()) {
    if (!source || visited.has(source)) {
      return;
    }

    if (Array.isArray(source)) {
      visited.add(source);
      for (const item of source) {
        this.recolectarValoresCatalogo(item, fieldAliases, output, visited);
      }
      return;
    }

    if (typeof source !== 'object') {
      return;
    }

    visited.add(source);
    const registro = source as Record<string, unknown>;

    for (const alias of fieldAliases) {
      const value = typeof registro[alias] === 'string'
        ? registro[alias].trim()
        : '';

      if (value) {
        output.add(value);
        break;
      }
    }

    for (const value of Object.values(registro)) {
      this.recolectarValoresCatalogo(value, fieldAliases, output, visited);
    }
  }

  aplicarSubFiltros() {
    this.dashboardStatusMsg = 'Sub filtros aplicados. Ya puedes consultar la informacion general.';
    this.mostrarSelectorUnidadesModal = false;
    this.mostrarSelectorLugarModal = false;
    this.mostrarSelectorEnemigoModal = false;
    this.mostrarSubFiltrosModal = false;
    this.cdr.markForCheck();
  }
  aplicarDocumentos() {
    this.mostrarDocumentosModal = false;
    this.cdr.markForCheck();
  }

  getResumenJerarquiaUnidades(): string[] {
    const resumen: string[] = [];

    if (this.filtrosForm.subFiltroDivisionesFt) {
      resumen.push(`Division: ${this.filtrosForm.subFiltroDivisionesFt}`);
    }

    if (this.filtrosForm.subFiltroDivisiones) {
      resumen.push(`Division FT: ${this.filtrosForm.subFiltroDivisiones}`);
    }

    for (const brigada of this.filtrosForm.subFiltroBrigadas) {
      resumen.push(`Brigada: ${brigada}`);
    }

    for (const ut of this.filtrosForm.subFiltroUt) {
      resumen.push(`UT: ${ut}`);
    }

    return resumen;
  }

  getResumenLugar(): string[] {
    const resumen: string[] = [];

    for (const dpto of this.filtrosForm.subFiltroDepartamento) {
      resumen.push(`Departamento: ${dpto}`);
    }

    for (const mpio of this.filtrosForm.subFiltroMunicipio) {
      resumen.push(`Municipio: ${mpio}`);
    }

    return resumen;
  }

  getResumenEnemigo(): string[] {
    const resumen: string[] = [];


    for (const enemigo of this.filtrosForm.subFiltroEnemigo) {
      resumen.push(`Enemigo: ${enemigo}`);
    }

    for (const estructura of this.filtrosForm.subFiltroEnemigoEstructura) {
      resumen.push(`Estructura: ${estructura}`);
    }

    return resumen;
  }

  getResumenJerarquiaOperacional(): string[] {
    const resumen: string[] = [];
    // Si hay una operación seleccionada, mostrarla en el resumen
    if (this.filtrosForm.subFiltroOperaciones) {
      resumen.push(`Operación: ${this.getOperacionSeleccionadaNombre()}`);
    }
    // Si hay un tipo de operación seleccionado, mostrarlo en el resumen
    if (this.filtrosForm.tiposOperacion) {
      resumen.push(`Tipo de operación: ${this.getTipoOperacionSeleccionadoNombre()}`);
    }
    // Si hay un hecho seleccionado, mostrarlo en el resumen
    if (this.filtrosForm.hechos) {
      resumen.push(`Hecho: ${this.getHechoSeleccionadoNombre()}`);
    }
        // Si hay un hecho seleccionado, mostrarlo en el resumen
    if (this.filtrosForm.hechos) {
      resumen.push(`Hecho: ${this.getHechoSeleccionadoNombre()}`);
    }
    // Si hay una estrategia afectada seleccionada, mostrarla en el resumen
    if (this.filtrosForm.estrategiasAfecta) {
      resumen.push(`Estrategia afectada: ${this.getEstrategiaAfectaSeleccionadaNombre()}`);
    }
    // Si hay un resultado Gaulas seleccionado, mostrarlo en el resumen
    if (this.filtrosForm.resultadosGaulas) {
      resumen.push(`Resultado Gaulas: ${this.getResultadoGaulasSeleccionadoNombre()}`);
    }
    // Si hay un resultado Coordinado seleccionado, mostrarlo en el resumen
    if (this.filtrosForm.resultadosCoordinados) {
      resumen.push(`Resultado Coordinado: ${this.getResultadoCoordinadoSeleccionadoNombre()}`);
    }
    // Si hay un resultado Conjunto seleccionado, mostrarlo en el resumen
    if (this.filtrosForm.resultadosConjuntos) {
      resumen.push(`Resultado Conjunto: ${this.getResultadoConjuntoSeleccionadoNombre()}`);
    }
    return resumen;
  }
      /**
   * Devuelve el nombre del resultado Conjunto seleccionado, si existe.
   */
  getResultadoConjuntoSeleccionadoNombre(): string {
    const resultado = this.filtrosForm.resultadosConjuntos;
    if (!resultado) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.resultadosConjuntos.find(o => o === resultado);
    return found || resultado;
  }
  /**
   * Devuelve el nombre del resultado Coordinado seleccionado, si existe.
   */
  getResultadoCoordinadoSeleccionadoNombre(): string {
    const resultado = this.filtrosForm.resultadosCoordinados;
    if (!resultado) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.resultadosCoordinados.find(o => o === resultado);
    return found || resultado;
  }
  /**
   * Devuelve el nombre del resultado Gaulas seleccionado, si existe.
   */
  getResultadoGaulasSeleccionadoNombre(): string {
    const resultado = this.filtrosForm.resultadosGaulas;
    if (!resultado) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.resultadosGaulas.find(o => o === resultado);
    return found || resultado;
  }
    /**
   * Devuelve el nombre de la estrategia afectada seleccionada, si existe.
   */
  getEstrategiaAfectaSeleccionadaNombre(): string {
    const estrategia = this.filtrosForm.estrategiasAfecta;
    if (!estrategia) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.estrategiasAfecta.find(o => o === estrategia);
    return found || estrategia;
  }
  /**
   * Devuelve el nombre del hecho seleccionado, si existe.
   */
  getHechoSeleccionadoNombre(): string {
    const hecho = this.filtrosForm.hechos;
    if (!hecho) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.hechos.find(o => o === hecho);
    return found || hecho;
  }

  /**
   * Devuelve el nombre del tipo de operación seleccionado, si existe.
   */
  getTipoOperacionSeleccionadoNombre(): string {
    const tipo = this.filtrosForm.tiposOperacion;
    if (!tipo) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.tiposOperacion.find(o => o === tipo);
    return found || tipo;
  }

  /**
   * Devuelve el nombre de la operación seleccionada, si existe.
   */
  getOperacionSeleccionadaNombre(): string {
    const op = this.filtrosForm.subFiltroOperaciones;
    if (!op) return '';
    // Buscar el nombre en el array de opciones
    const found = this.opcionesSubFiltros.operaciones.find(o => o === op);
    return found || op;
  }
  
    getResumenDocumentosAplicados(): string[] {
    const resumen = [

      ...this.getDocSeleccionadosInfraestrucura().map(Documento => ` ${Documento.texto}`),

    ];


    return resumen;
  }
  getDocSeleccionadosInfraestrucura() {

    if (!this.documentoInfraSeleccionado) {
      return [];
    }

    return [this.documentoInfraSeleccionado];
  }

  getResumenSubFiltrosAplicados(): string[] {
    const resumen = [
      ...this.getResumenJerarquiaUnidades(),
      ...this.getResumenLugar(),
      ...this.getResumenEnemigo(),
      ...this.getApoyosSeleccionados().map(apoyo => ` ${apoyo.texto}`),
      ...this.getResumenJerarquiaOperacional()
    ];

    // Agregar subregión seleccionada si existe
    if (this.subregionSeleccionada && this.subregionSeleccionada.nombre) {
      resumen.unshift(`Subregión: ${this.subregionSeleccionada.nombre}`);
    }

    if (this.filtrosForm.subFiltroEstado) {
      resumen.push(`Estado: ${this.filtrosForm.subFiltroEstado}`);
    }

    return resumen;
  }
  getApoyosSeleccionados() {

    if (!this.apoyoSeleccionado) {
      return [];
    }

    return [this.apoyoSeleccionado];
  }

  tieneSubFiltrosActivos(): boolean {
    return this.getResumenSubFiltrosAplicados().length > 0;
  }
  tieneDocumentosActivos(): boolean {
    
    return this.getResumenDocumentosAplicados().length > 0;
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
    const puntos = this.prepararPuntosParaMapa();
    const bounds: L.LatLngTuple[] = [];
    for (const punto of puntos) {
      const latLng: L.LatLngTuple = [punto.latitudRender, punto.longitudRender];
      bounds.push(latLng);
      const tipo = punto.tipo || this.tipoSeleccionado || 'Tipo';
      const color = this.getColorTipo(punto.tipoKey);

      // Usar un icono de imagen simple (círculo SVG como data URL)
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='10' fill='${color}' stroke='#333' stroke-width='2'/></svg>`;
      const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      const icon = L.icon({
        iconUrl,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10]
      });

      const marker = L.marker(latLng, { icon })
        .bindPopup(
          `<strong>${this.escapeHtml(tipo)}</strong><br>
          <b>Cantidad:</b> ${punto.cantidad}<br>
          <b>Registros agrupados:</b> ${punto.cantidadRegistros}<br>
          <b>Ubicación:</b> ${this.escapeHtml(punto.ubicacion)}<br>
          <b>División:</b> ${this.escapeHtml(punto.division)}`,
          { closeButton: false, offset: [0, -8] }
        );

      (marker as L.Marker & { feature?: Record<string, unknown> }).feature = {
        type: 'Feature',
        properties: {
          label: tipo,
          tipo,
          cantidad: punto.cantidad,
          cantidadRegistros: punto.cantidadRegistros,
          ubicacion: punto.ubicacion,
          division: punto.division,
          kmlStyleId: this.getTipoStyleId(punto.tipoKey),
          shapeType: 'json-marker'
        },
        geometry: {
          type: 'Point',
          coordinates: [punto.longitudRender, punto.latitudRender]
        }
      };

      marker.addTo(this.markerLayer);
    }
    if (bounds.length) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
      return;
    }

    this.map.setView([4.5709, -74.2973], 5);
  }
  //fliltar dashboard


  // --- Datos de ejemplo eliminados: ahora los datos vienen del backend --- 



  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  get puedeVerEstadisticasCrud() {
    return !!this.permisoEstadisticas?.puede_ver;
  }

  get puedeCrearEstadisticasCrud() {
    return !!this.permisoEstadisticas?.puede_crear;
  }

  get puedeEditarEstadisticasCrud() {
    return !!this.permisoEstadisticas?.puede_editar;
  }

  get puedeEliminarEstadisticasCrud() {
    return !!this.permisoEstadisticas?.puede_eliminar;
  }


  dashboardErrorMsg = '';
  actualizar_dashboard(): void {
    const rangoFechas = this.obtenerRangoFechasDashboard();

    if (!rangoFechas) {
      return;
    }

    const formData = new FormData();
    formData.append('fecha_inicio', rangoFechas.fechaInicio);
    formData.append('fecha_fin', rangoFechas.fechaFin);
    formData.append(
      'subFiltroDivisionesFt',
      JSON.stringify(this.filtrosForm.subFiltroDivisionesFt || '')
    );

    formData.append(
      'subFiltroDivisiones',
      JSON.stringify(this.filtrosForm.subFiltroDivisiones || '')
    );

    formData.append(
      'subFiltroBrigadas',
      JSON.stringify(this.filtrosForm.subFiltroBrigadas || '')
    );

    formData.append(
      'subFiltroBatallones',
      JSON.stringify(this.filtrosForm.subFiltroBatallones || '')
    );

    formData.append(
      'subFiltroDepartamento',
      JSON.stringify(this.filtrosForm.subFiltroDepartamento || '')
    );

    formData.append(
      'subFiltroMunicipio',
      JSON.stringify(this.filtrosForm.subFiltroMunicipio || '')
    );

    formData.append(
      'subregion',
      JSON.stringify(this.subregionSeleccionada || [])
    );
    formData.append(
      'enemigo',
      JSON.stringify(this.filtrosForm.subFiltroEnemigo || [])
    );
    formData.append(
      'enemigo_estructura',
      JSON.stringify(this.filtrosForm.subFiltroEnemigoEstructura || [])
    );
    formData.append(
      'apoyos',
      JSON.stringify(this.apoyoSeleccionado || [])
    );
        formData.append(
      'subFiltroEnemigo',
      JSON.stringify(this.filtrosForm.subFiltroEnemigo || '')
    );

    formData.append(
      'subFiltroEnemigoEstructura',
      JSON.stringify(this.filtrosForm.subFiltroEnemigoEstructura || '')
    );

    formData.append(
      'operacion',
      JSON.stringify(this.filtrosForm.subFiltroEnemigoEstructura || '')
    );

    formData.append(
      'tipoOperacion',
      JSON.stringify(this.filtrosForm.tiposOperacion || '')
    );
    formData.append(
      'hecho',
      JSON.stringify(this.filtrosForm.hechos || '')
    );
    formData.append(
      'estrategiaAfecta',
      JSON.stringify(this.filtrosForm.estrategiasAfecta || '')
    );
    formData.append(
      'resultadosGaulas',
      JSON.stringify(this.filtrosForm.resultadosGaulas || '')
    );
    formData.append(
      'resultadosCoordinados',
      JSON.stringify(this.filtrosForm.resultadosCoordinados || '')
    );
    formData.append(
      'resultadosConjuntos',
      JSON.stringify(this.filtrosForm.resultadosConjuntos || '')
    );
    this.cargandoDashboard = true;
    this.dashboardStatusMsg = 'Actualizando dashboard...';

    this.http.post<any>(`${this.api}`, formData).pipe(
      catchError(error => {
        console.error('Error al enviar fechas:', error);
        return throwError(() => error);
      })
    ).subscribe({
      next: (resp) => {
        this.aplicarRespuestaDashboard(resp);
        this.dashboardStatusMsg = this.construirMensajeDashboard();
        this.mostrarFiltrosModal = false;
        this.cargandoDashboard = false;
      },
      error: (err) => {
        this.dashboardStatusMsg = 'No fue posible actualizar el dashboard.';
        this.cargandoDashboard = false;
      }
    });
  }

  private aplicarRespuestaDashboard(resp: any) {
    const categoriaActual = this.categoriaSeleccionada;
    const tipoActual = this.tipoSeleccionado;

    this.eventos = this.normalizarEventos(resp);
    console.log('Dashboard normalizado:', this.getDashboardResumen());
    this.reconstruirColeccionesDashboard();

    this.categoriaSeleccionada = categoriaActual && this.categorias.includes(categoriaActual)
      ? categoriaActual
      : (this.categorias[0] || null);

    const tiposActivos = this.categoriaSeleccionada
      ? this.tiposPorCategoria[this.categoriaSeleccionada] || []
      : [];

    this.tipoSeleccionado = tipoActual === this.allTypesToken
      ? this.allTypesToken
      : tiposActivos.some((tipo) => tipo.key === tipoActual)
        ? tipoActual
        : this.allTypesToken;

    setTimeout(() => {
      this.renderMarkers();
      this.scheduleMapResize(0);
      this.cdr.markForCheck();
    }, 0);
  }

  private obtenerRangoFechasDashboard() {
    const fechaInicio = this.filtrosForm.lapsoInicialA;
    const fechaFin = this.filtrosForm.lapsoInicialB;

    if (!fechaInicio || !fechaFin) {
      this.dashboardErrorMsg = 'Debes seleccionar ambas fechas.';
      setTimeout(() => {
        const inicioInput = document.querySelector('input[name="lapsoInicialA"]') as HTMLInputElement;
        const finInput = document.querySelector('input[name="lapsoInicialB"]') as HTMLInputElement;
        if (inicioInput && !fechaInicio) inicioInput.classList.add('input-error');
        if (finInput && !fechaFin) finInput.classList.add('input-error');
      }, 0);
      alert('Debes seleccionar ambas fechas.');
      return null;
    }

    this.dashboardErrorMsg = '';
    const inicioInput = document.querySelector('input[name="lapsoInicialA"]') as HTMLInputElement;
    const finInput = document.querySelector('input[name="lapsoInicialB"]') as HTMLInputElement;
    if (inicioInput) inicioInput.classList.remove('input-error');
    if (finInput) finInput.classList.remove('input-error');

    return { fechaInicio, fechaFin };
  }

   private obtenerRangoFechasDashboard_2() {
    const fechaInicio = this.filtrosForm.lapsoFinalA;
    const fechaFin = this.filtrosForm.lapsoFinalB;

    if (!fechaInicio || !fechaFin) {
      this.dashboardErrorMsg = 'Debes seleccionar ambas fechas.';
      setTimeout(() => {
        const inicioInput = document.querySelector('input[name="lapsoFinalA"]') as HTMLInputElement;
        const finInput = document.querySelector('input[name="lapsoFinalB"]') as HTMLInputElement;
        if (inicioInput && !fechaInicio) inicioInput.classList.add('input-error');
        if (finInput && !fechaFin) finInput.classList.add('input-error');
      }, 0);
      alert('Debes seleccionar ambas fechas.');
      return null;
    }

    this.dashboardErrorMsg = '';
    const inicioInput = document.querySelector('input[name="lapsoFinalA"]') as HTMLInputElement;
    const finInput = document.querySelector('input[name="lapsoFinalB"]') as HTMLInputElement;
    if (inicioInput) inicioInput.classList.remove('input-error');
    if (finInput) finInput.classList.remove('input-error');

    return { fechaInicio, fechaFin };
  }

  

  private reconstruirColeccionesDashboard() {
    this.categorias = Array.from(new Set(this.eventos.map((evento) => evento.categoria)));
    this.tiposPorCategoria = {};
    this.puntosPorTipo = {};
    this.coloresPorTipo = {};

    let colorIdx = 0;
    for (const categoria of this.categorias) {
      const tipos = this.eventos
        .filter((evento) => evento.categoria === categoria)
        .map((evento) => ({
          key: this.buildTipoKey(evento.categoria, evento.tipo),
          tipo: evento.tipo,
          total: evento.cantidad_total
        }));

      this.tiposPorCategoria[categoria] = tipos;

      for (const tipo of tipos) {
        const evento = this.eventos.find((item) => this.buildTipoKey(item.categoria, item.tipo) === tipo.key);
        this.puntosPorTipo[tipo.key] = evento?.puntos || [];
        if (!this.coloresPorTipo[tipo.key]) {
          this.coloresPorTipo[tipo.key] = this.palette[colorIdx % this.palette.length];
          colorIdx++;
        }
      }
    }
  }

  private buildTipoKey(categoria: string, tipo: string) {
    return `${categoria}__${tipo}`;
  }

  private getDashboardResumen() {
    return {
      eventos: this.eventos.length,
      puntos: this.eventos.reduce((total, evento) => total + evento.puntos.length, 0)
    };
  }

  private construirMensajeDashboard() {
    const resumen = this.getDashboardResumen();
    return resumen.eventos
      ? `Dashboard actualizado. ${resumen.eventos} tipos y ${resumen.puntos} puntos cargados.`
      : 'La consulta no devolvio resultados.';
  }

  private normalizarEventos(eventosRaw: any): Evento[] {
    let eventosLista =
      eventosRaw?.eventos?.eventos ??
      eventosRaw?.eventos ??
      eventosRaw?.data?.eventos?.eventos ??
      eventosRaw?.data?.eventos ??
      eventosRaw;

    if (!Array.isArray(eventosLista)) {
      if (eventosLista && typeof eventosLista === 'object') {
        const nestedEventos =
          (eventosLista as any)?.eventos?.eventos ??
          (eventosLista as any)?.eventos;

        eventosLista = Array.isArray(nestedEventos)
          ? nestedEventos
          : Object.values(eventosLista);
      } else {
        eventosLista = [];
      }
    }

    return eventosLista.map((ev: any, index: number) => {
      let puntos: any[] = [];

      if (Array.isArray(ev.puntos)) {
        for (const division of ev.puntos) {
          if (Array.isArray(division.puntos)) {
            puntos = puntos.concat(
              division.puntos
                .map((punto: any) => ({
                  ...punto,
                  latitud: typeof punto.latitud === 'string' ? parseFloat(punto.latitud) : punto.latitud,
                  longitud: typeof punto.longitud === 'string' ? parseFloat(punto.longitud) : punto.longitud,
                  cantidad: typeof punto.cantidad === 'string' ? parseFloat(punto.cantidad) : punto.cantidad,
                  ubicacion: punto.ubicacion || division.ubicacion || 'Sin ubicacion',
                  division: punto.division || division.division || 'Sin division'
                }))
                .filter((punto: any) => Number.isFinite(punto.latitud) && Number.isFinite(punto.longitud))
            );
          }
        }
      }

      return {
        id: typeof ev.id === 'number' ? ev.id : index + 1,
        categoria: ev.categoria || 'Sin categoria',
        tipo: ev.tipo || 'Sin tipo',
        cantidad_total: typeof ev.cantidad_total === 'string'
          ? parseFloat(ev.cantidad_total)
          : Number(ev.cantidad_total ?? puntos.reduce((acc, punto) => acc + (Number(punto.cantidad) || 0), 0)),
        puntos
      };
    });
  }

  private prepararPuntosParaMapa(): MapaPunto[] {
    const puntosActivos = this.getPuntosActivos();
    const puntos: MapaPunto[] = puntosActivos.map((punto) => ({
      latitud: Number(punto.latitud),
      longitud: Number(punto.longitud),
      cantidad: Number(punto.cantidad) || 0,
      ubicacion: punto.ubicacion,
      division: punto.division,
      tipo: String((punto as any).tipo || this.tipoSeleccionado || 'Tipo'),
      tipoKey: String((punto as any).tipoKey || this.tipoSeleccionado || 'tipo'),
      cantidadRegistros: 1,
      latitudRender: Number(punto.latitud),
      longitudRender: Number(punto.longitud)
    }));
    const gruposPorCoordenada = new Map<string, MapaPunto[]>();

    for (const punto of puntos) {
      const key = `${punto.latitud.toFixed(6)}|${punto.longitud.toFixed(6)}`;
      const grupo = gruposPorCoordenada.get(key) || [];
      grupo.push(punto);
      gruposPorCoordenada.set(key, grupo);
    }

    gruposPorCoordenada.forEach((grupo) => {
      if (grupo.length === 1) {
        return;
      }

      grupo.forEach((punto, index) => {
        const angulo = (Math.PI * 2 * index) / grupo.length;
        // Radio pequeño para evitar que los puntos se desplacen demasiado lejos
        const radio = 0.0003;
        punto.latitudRender = punto.latitud + (Math.sin(angulo) * radio);
        punto.longitudRender = punto.longitud + (Math.cos(angulo) * radio);
      });
    });

    return puntos;
  }

  /**
   * Actualiza la posición del tooltip en el DOM usando variables CSS.
   * Se usa en el template con (mousemove)="$event".
   */
  public setTooltipPosition(event: MouseEvent) {
    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--tooltip-mouse-x', x + 'px');
    document.documentElement.style.setProperty('--tooltip-mouse-y', y + 'px');
  }

  /**
   * Restaura la posición del tooltip a su valor por defecto.
   * Se usa en el template con (mouseleave).
   */
  public clearTooltipPosition() {
    document.documentElement.style.setProperty('--tooltip-mouse-x', '50vw');
    document.documentElement.style.setProperty('--tooltip-mouse-y', '0px');
  }


descargar_documento(): void {

  // ==========================================
  // RANGO FECHAS
  // ==========================================

  const rangoFechas =
    this.obtenerRangoFechasDashboard();

  const rangoFechasFinal =
    this.obtenerRangoFechasDashboard_2();

  if (!rangoFechasFinal) {
    return;
  }
  if (!rangoFechas) {
    return;
  }
    if (!this.documentoInfraSeleccionado) {
    return;
  }

  // ==========================================
  // FORM DATA
  // ==========================================

  const formData = new FormData();

  formData.append(
    'fecha_inicio',
    rangoFechas.fechaInicio
  );

  formData.append(
    'fecha_fin',
    rangoFechas.fechaFin
  );

  formData.append(
    'fecha_inicio_final',
    rangoFechasFinal.fechaInicio
  );
  formData.append(
    'fecha_fin_final',
    rangoFechasFinal.fechaFin
  );

  // ==========================================
  // FILTROS MILITARES
  // ==========================================

  formData.append(
    'subFiltroDivisionesFt',
    JSON.stringify(
      this.filtrosForm.subFiltroDivisionesFt || ''
    )
  );

  formData.append(
    'subFiltroDivisiones',
    JSON.stringify(
      this.filtrosForm.subFiltroDivisiones || ''
    )
  );

  formData.append(
    'subFiltroBrigadas',
    JSON.stringify(
      this.filtrosForm.subFiltroBrigadas || []
    )
  );

  formData.append(
    'subFiltroBatallones',
    JSON.stringify(
      this.filtrosForm.subFiltroBatallones || []
    )
  );

  // ==========================================
  // GEOGRAFICOS
  // ==========================================

  formData.append(
    'subFiltroDepartamento',
    JSON.stringify(
      this.filtrosForm.subFiltroDepartamento || []
    )
  );

  formData.append(
    'subFiltroMunicipio',
    JSON.stringify(
      this.filtrosForm.subFiltroMunicipio || []
    )
  );

  formData.append(
    'subregion',
    JSON.stringify(
      this.subregionSeleccionada || null
    )
  );

  // ==========================================
  // ENEMIGO
  // ==========================================

  formData.append(
    'enemigo',
    JSON.stringify(
      this.filtrosForm.subFiltroEnemigo || []
    )
  );

  formData.append(
    'enemigo_estructura',
    JSON.stringify(
      this.filtrosForm.subFiltroEnemigoEstructura || []
    )
  );

  // ==========================================
  // APOYOS
  // ==========================================

  formData.append(
    'apoyos',
    JSON.stringify(
      this.apoyoSeleccionado || null
    )
  );

  // ==========================================
  // OPERACION
  // ==========================================

  formData.append(
    'operacion',
    JSON.stringify(
      this.filtrosForm.subFiltroOperaciones || []
    )
  );

  // ==========================================
  // OTROS FILTROS
  // ==========================================

  formData.append(
    'tipoOperacion',
    JSON.stringify(
      this.filtrosForm.tiposOperacion || []
    )
  );

  formData.append(
    'hecho',
    JSON.stringify(
      this.filtrosForm.hechos || []
    )
  );

  formData.append(
    'estrategiaAfecta',
    JSON.stringify(
      this.filtrosForm.estrategiasAfecta || []
    )
  );

  formData.append(
    'resultadosGaulas',
    JSON.stringify(
      this.filtrosForm.resultadosGaulas || ''
    )
  );

  formData.append(
    'resultadosCoordinados',
    JSON.stringify(
      this.filtrosForm.resultadosCoordinados || ''
    )
  );

  formData.append(
    'resultadosConjuntos',
    JSON.stringify(
      this.filtrosForm.resultadosConjuntos || ''
    )
  );

  // ==========================================
  // DOCUMENTO
  // ==========================================

  formData.append(
    'documento',
    JSON.stringify(
      this.documentoInfraSeleccionado || ''
    )
  );

  // ==========================================
  // UI
  // ==========================================

  this.cargandoDashboard = true;

  this.dashboardStatusMsg =
    'Generando documento...';

  // ==========================================
  // REQUEST
  // ==========================================

  this.http.post(

    this.api_2,

    formData,

    {
      responseType: 'blob'
    }

  ).pipe(

    catchError(error => {

      console.error(
        'Error al descargar documento:',
        error
      );

      this.descargadoDocumentoStatusMsg =
        'No fue posible descargar el documento.';

      this.descargandoDocumento = false;

      return throwError(() => error);
    })

  ).subscribe({

    // ==========================================
    // SUCCESS
    // ==========================================

    next: (blob: Blob) => {

      const url =
        window.URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = url;

      a.download =
        'reporte_operacional.pptx';

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);

      // ==========================================
      // UI
      // ==========================================

      this.descargadoDocumentoStatusMsg =
        'Documento descargado correctamente.';

      this.descargandoDocumento = false;
    },


    // ==========================================
    // ERROR
    // ==========================================

    error: () => {

      this.dashboardStatusMsg =
        'Error descargando documento.';

      this.cargandoDashboard = false;
    }
  });
}
}
