import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SidebarComponent, SidebarLayoutChange } from '../../shared/sidebar/sidebar.component';
import { AuthService, PermisoAcceso } from '../../services/auth';
import { SidebarOperacionalComponent } from './components/sidebar-operacional/sidebar-operacional.component';
import { FiltrosOperacionalesComponent } from './components/filtros-operacionales/filtros-operacionales.component';
import { MapaOperacionalComponent } from './components/mapa-operacional/mapa-operacional.component';
import {
  OperationalCardId,
  OperationalDashboardViewModel,
  OperationalFilterOptions,
  OperationalFilterState,
  OperationalFeature,
  OperationalMapRenderModel,
  OperationalTableRow,
  SeguimientoBackendResponse
} from './interfaces/seguimiento-operacional-dashboard.interface';
import {
  SeguimientoFiltrosAvanzados,
  SeguimientoFiltroState,
  SeguimientoMapState,
  SeguimientoMenu,
  SeguimientoSeccionVisible,
  SeguimientoSidebarLayoutState,
  SeguimientoSubmenu
} from './interfaces/seguimiento-operacional.interface';
import { SeguimientoOperacionalService } from './services/seguimiento-operacional.service';
import { SeguimientoOperacionalUiService } from './services/seguimiento-operacional-ui.service';
import { adaptSeguimientoSnapshot } from './adapters/seguimiento-operacional.adapter';
import {
  buildOperationalFilterOptions,
  buildPelotonStatusByDivision,
  buildSummaryByDivision,
  buildOperationalViewModel,
  buildQuickFilterSummary,
  DEFAULT_OPERATIONAL_FILTERS,
  nextSelectedFeatureId
} from './utils/seguimiento-operacional-filters';
import {
  downloadVisibleCsv,
  downloadVisibleGeoJson,
  downloadVisibleKml
} from './utils/seguimiento-operacional-export';

type MapLayerKey = 'eventos' | 'insitop' | 'movimientos' | 'aisladas';
type SummaryCardKey =
  | 'eventos'
  | 'informacion_insitop'
  | 'exde'
  | 'pelotones'
  | 'movimientos'
  | 'unidades_aisladas'
  | 'cabo_cdt'
  | 'efectivos_disminuidos';

interface SummaryCardVm {
  id: SummaryCardKey;
  label: string;
  value: string;
  helper: string;
  mode: 'map' | 'modal';
  active: boolean;
}

const EMPTY_FILTER_OPTIONS: OperationalFilterOptions = {
  divisiones: [],
  brigadas: [],
  unidades: [],
  departamentos: [],
  municipios: [],
  operaciones: []
};

const EMPTY_MAP_MODEL: OperationalMapRenderModel = {
  features: [],
  movements: [],
  selectedFeatureId: null,
  legendItems: [],
  totals: {
    visibles: '0',
    pelotones: '0',
    alertas: '0',
    movimientos: '0'
  }
};

const EMPTY_VIEW_MODEL: OperationalDashboardViewModel = {
  headerTitle: 'Seguimiento Operacional Táctico',
  headerDescription: 'Mapa táctico sin datos cargados.',
  headerStatus: 'Sin datos',
  refreshLabel: 'Sin sincronización',
  kpis: [],
  divisionChips: [],
  tableRows: [],
  selectedDetail: null,
  visibleCounts: {
    pelotones: 0,
    operaciones: 0,
    entrenamiento: 0,
    descanso: 0,
    exde: 0,
    alertasCriticas: 0
  },
  activeCardId: 'pelotones',
  tableCountLabel: '0 registros tácticos',
  mapModel: EMPTY_MAP_MODEL
};

/**
 * Shell táctico principal.
 * Coordina filtros, backend, selección y layout, pero delega la lógica pesada
 * a adapter, utilidades puras y al mapa especializado.
 */
@Component({
  selector: 'app-seguimiento-operacional',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    SidebarOperacionalComponent,
    FiltrosOperacionalesComponent,
    MapaOperacionalComponent
  ],
  templateUrl: './seguimiento-operacional.component.html',
  styleUrls: ['./seguimiento-operacional.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeguimientoOperacionalComponent implements OnInit, OnDestroy {
  @ViewChild('mapFullscreenHost') private readonly mapFullscreenHostRef?: ElementRef<HTMLElement>;
  @ViewChild(MapaOperacionalComponent) private readonly mapaOperacionalComponent?: MapaOperacionalComponent;

  readonly permisoSeguimiento: PermisoAcceso | null;
  readonly puedeVerSeguimiento: boolean;
  readonly menuBase: SeguimientoMenu[];
  readonly filtrosIniciales: SeguimientoFiltroState;
  readonly filtrosAvanzadosIniciales: SeguimientoFiltrosAvanzados = {
    modoFecha: 'preset',
    preset: '24h',
    fechaInicial: '',
    fechaFinal: '',
    fechaAlerta: ''
  };
  readonly trackById = (_: number, item: { id: string }) => item.id;
  readonly trackByKey = (_: number, item: { key: string }) => item.key;
  readonly trackByLabel = (_: number, item: { label: string }) => item.label;
  readonly trackByText = (_: number, item: string) => item;
  readonly trackByDivision = (_: number, item: { division: string }) => item.division;
  readonly trackByCard = (_: number, item: SummaryCardVm) => item.id;

  menu: SeguimientoMenu[] = [];
  modulos: SeguimientoSeccionVisible[] = [
    { clave: 'resumen', etiqueta: 'Resumen', visible: true },
    { clave: 'indicadores', etiqueta: 'Indicadores', visible: true },
    { clave: 'alertas', etiqueta: 'Alertas', visible: true },
    { clave: 'estadisticas', etiqueta: 'Estadisticas', visible: false },
    { clave: 'eventos', etiqueta: 'Eventos', visible: true },
    { clave: 'mapa', etiqueta: 'Mapa', visible: true }
  ];
  seccionActiva = '';
  filtros: SeguimientoFiltroState;
  filtrosAvanzados: SeguimientoFiltrosAvanzados;
  operationalFilters: OperationalFilterState = { ...DEFAULT_OPERATIONAL_FILTERS };
  filterOptions: OperationalFilterOptions = EMPTY_FILTER_OPTIONS;

  sidebarState: SeguimientoSidebarLayoutState = {
    visible: true,
    compacto: false,
    width: 310
  };
  mapState: SeguimientoMapState = {
    visible: true,
    expandido: false,
    fullscreen: false,
    modoTactico: true
  };
  layoutRevision = 0;

  mostrarFiltrosModal = false;
  mostrarPanelControlModal = false;
  loadingConsulta = false;
  successConsulta = false;
  errorConsulta = false;
  statusMessage = 'Centro táctico listo para consulta.';
  refreshLabel = 'Sin sincronización';
  showKpis = true;
  showTable = true;
  showPanel = true;

  quickDivisionValue = 'TODAS';
  quickAlertValue: OperationalFilterState['alerta'] = 'TODAS';
  quickOperationValue = 'TODAS';
  quickExdeValue: OperationalFilterState['exde'] = 'TODOS';
  quickFilterButtonLabel = 'Filtrar';

  selectedCardId: OperationalCardId = 'pelotones';
  selectedFeatureId: string | null = null;
  tableSearch = '';
  tableSortKey: keyof OperationalTableRow = 'timestamp';
  tableSortDirection: 'asc' | 'desc' = 'desc';
  tablePage = 1;
  readonly tablePageSize = 12;
  visibleTableRows: OperationalTableRow[] = [];
  currentTableRows: OperationalTableRow[] = [];
  totalTablePages = 1;
  tableRangeLabel = '0-0 de 0';

  dashboardVm: OperationalDashboardViewModel = EMPTY_VIEW_MODEL;
  mapRenderModel: OperationalMapRenderModel = EMPTY_MAP_MODEL;
  quickFilterSummary: string[] = buildQuickFilterSummary(DEFAULT_OPERATIONAL_FILTERS);
  exportStatus = '';
  showPelotonesModal = false;
  showExdeModal = false;
  showGenericSummaryModal = false;
  showDetailOverlay = false;
  selectedTableDetail: OperationalTableRow | null = null;
  exdeBreakdown: Array<{ id: string; label: string; total: number }> = [];
  pelotonBreakdown: Array<{ division: string; operaciones: number; entrenamiento: number; descanso: number; total: number }> = [];
  genericSummaryTitle = '';
  genericSummaryRows: Array<{ id: string; label: string; total: number }> = [];
  summaryCards: SummaryCardVm[] = [];
  readonly layerVisibility: Record<MapLayerKey, boolean> = {
    eventos: true,
    insitop: true,
    movimientos: true,
    aisladas: true
  };
  activeMapFocus: 'all' | MapLayerKey = 'all';

  private readonly subscriptions = new Subscription();
  private snapshot = adaptSeguimientoSnapshot({
    eventos: [],
    informacion_insitop: [],
    exde: [],
    pelotones: [],
    movimientos: [],
    unidades_aisladas: [],
    cabo_cdt: [],
    efectivos_disminuidos: []
  });
  private readonly fullscreenChangeHandler = () => {
    const fullscreenActive = this.document.fullscreenElement === this.mapFullscreenHostRef?.nativeElement;
    this.uiState.actualizarMapa({ fullscreen: fullscreenActive, visible: true });
  };

  constructor(
    private readonly auth: AuthService,
    private readonly seguimientoService: SeguimientoOperacionalService,
    private readonly uiState: SeguimientoOperacionalUiService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.permisoSeguimiento = this.auth.obtenerPermisoRuta('/seguimiento');
    this.puedeVerSeguimiento = !!this.permisoSeguimiento?.puede_ver;
    this.menuBase = this.seguimientoService.obtenerMenuOperacional();
    this.menu = this.menuBase.map((item) => ({ ...item, submenus: [...item.submenus] }));
    this.seccionActiva = this.menu[0]?.submenus[0]?.id || '';
    this.filtrosIniciales = this.seguimientoService.filtrosIniciales;
    this.filtros = { ...this.filtrosIniciales };
    this.filtrosAvanzados = { ...this.filtrosAvanzadosIniciales };
  }

  ngOnInit() {
    this.applyPresetDates();
    this.syncQuickFilters();
    this.syncModuleVisibility();
    this.document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);

    this.subscriptions.add(
      this.uiState.sidebarState$.subscribe((state) => {
        this.sidebarState = state;
        this.cdr.markForCheck();
      })
    );

    this.subscriptions.add(
      this.uiState.mapState$.subscribe((state) => {
        this.mapState = state;
        this.modulos = this.modulos.map((item) =>
          item.clave === 'mapa' ? { ...item, visible: state.visible } : item
        );
        this.cdr.markForCheck();
      })
    );

    this.subscriptions.add(
      this.uiState.layoutRevision$.subscribe((revision) => {
        this.layoutRevision = revision;
        this.cdr.markForCheck();
      })
    );

    this.statusMessage = this.puedeVerSeguimiento
      ? 'Configura filtros y ejecuta la consulta tactica manualmente.'
      : 'Centro tactico no disponible para este usuario.';
  }

  ngOnDestroy() {
    this.document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    this.subscriptions.unsubscribe();
  }

  abrirFiltros() { this.mostrarFiltrosModal = true; }
  cerrarFiltros() { this.mostrarFiltrosModal = false; }
  abrirPanelControl() { this.mostrarPanelControlModal = true; }
  cerrarPanelControl() { this.mostrarPanelControlModal = false; }

  toggleSidebar() {
    this.uiState.actualizarSidebar({ visible: !this.sidebarState.visible });
  }

  onSidebarLayoutChange(layout: SidebarLayoutChange) {
    this.uiState.actualizarSidebar(layout);
  }

  toggleMenu(menuPrincipal: SeguimientoMenu) {
    this.menu = this.menu.map((item) => ({
      ...item,
      abierto: item.nombre === menuPrincipal.nombre ? !item.abierto : item.abierto
    }));
  }

  seleccionarSubmenu(menuPrincipal: SeguimientoMenu, submenu: SeguimientoSubmenu) {
    this.seccionActiva = submenu.id;
    this.menu = this.menu.map((item) => ({
      ...item,
      abierto: item.nombre === menuPrincipal.nombre
    }));
    this.statusMessage = 'Modulo listo. Ejecuta Filtrar para consultar la nueva vista.';
    this.cdr.markForCheck();
  }

  alternarModulo(clave: string) {
    if (clave === 'mapa') {
      this.uiState.alternarMapaVisible();
      return;
    }
    this.modulos = this.modulos.map((item) =>
      item.clave === clave ? { ...item, visible: !item.visible } : item
    );
    this.syncModuleVisibility();
    this.uiState.bumpLayoutRevision();
  }

  alternarMapa() { this.uiState.alternarMapaVisible(); }
  alternarMapaExpandido() { this.uiState.alternarMapaExpandido(); }
  alternarModoTactico() { this.uiState.alternarModoTactico(); }

  alternarMapaFullscreen() {
    const host = this.mapFullscreenHostRef?.nativeElement;
    if (!host) {
      return;
    }
    if (this.document.fullscreenElement === host) {
      this.document.exitFullscreen?.();
      return;
    }
    host.requestFullscreen?.();
  }

  aplicarFiltros() {
    this.applyPresetDates();
    this.mostrarFiltrosModal = false;
    this.syncQuickFilters();
    this.consultarOperacionTactica();
  }

  limpiarFiltros() {
    this.filtros = { ...this.filtrosIniciales };
    this.filtrosAvanzados = { ...this.filtrosAvanzadosIniciales };
    this.operationalFilters = { ...DEFAULT_OPERATIONAL_FILTERS };
    this.selectedCardId = 'pelotones';
    this.tableSearch = '';
    this.tableSortKey = 'timestamp';
    this.tableSortDirection = 'desc';
    this.tablePage = 1;
    this.applyPresetDates();
    this.syncQuickFilters();
    this.resetLayerVisibility();
    this.rebuildDashboard();
    this.statusMessage = 'Filtros reiniciados. Ejecuta Filtrar para consultar nuevamente.';
    this.exportStatus = '';
    this.cdr.markForCheck();
  }

  consultarOperacionTactica() {
    this.loadingConsulta = true;
    this.successConsulta = false;
    this.errorConsulta = false;
    this.statusMessage = 'Consultando teatro operacional...';

    const formData = new FormData();
    formData.append('fecha_inicio', this.filtrosAvanzados.fechaInicial || '');
    formData.append('fecha_fin', this.filtrosAvanzados.fechaFinal || '');
    formData.append('fechaAlerta', this.filtrosAvanzados.fechaAlerta || '');
    formData.append('modulo', this.seccionActiva || '');

    Object.entries(this.filtros).forEach(([key, value]) => {
      formData.append(key, value != null ? String(value) : '');
    });

    Object.entries(this.filtrosAvanzados).forEach(([key, value]) => {
      formData.append(key, value != null ? String(value) : '');
    });

    this.seguimientoService.consultarOperacion(formData).subscribe({
      next: (response) => {
        this.snapshot = adaptSeguimientoSnapshot(response as SeguimientoBackendResponse);
        this.filterOptions = buildOperationalFilterOptions(this.snapshot);
        this.refreshLabel = new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date());
        this.statusMessage = 'Consulta táctica actualizada correctamente.';
        this.loadingConsulta = false;
        this.successConsulta = true;
        this.errorConsulta = false;
        this.rebuildDashboard();
      },
      error: () => {
        this.statusMessage = 'No fue posible actualizar la vista operacional.';
        this.loadingConsulta = false;
        this.successConsulta = false;
        this.errorConsulta = true;
        this.cdr.markForCheck();
      }
    });
  }

  aplicarFiltrosRapidos() {
    this.operationalFilters = {
      ...this.operationalFilters,
      division: this.quickDivisionValue,
      alerta: this.quickAlertValue,
      operacion: this.quickOperationValue,
      exde: this.quickExdeValue
    };
    this.tablePage = 1;
    this.resetLayerVisibility();
    this.consultarOperacionTactica();
  }

  seleccionarCard(cardId: OperationalCardId) {
    if (cardId === 'pelotones') {
      this.showPelotonesModal = true;
      return;
    }
    if (cardId === 'exde') {
      this.showExdeModal = true;
      return;
    }
    this.selectedCardId = cardId;
    this.tablePage = 1;
    this.rebuildDashboard();
  }

  seleccionarSummaryCard(cardId: SummaryCardKey) {
    if (cardId === 'eventos') {
      this.focusMapLayer('eventos');
      return;
    }
    if (cardId === 'informacion_insitop') {
      this.focusMapLayer('insitop');
      return;
    }
    if (cardId === 'movimientos') {
      this.focusMapLayer('movimientos');
      return;
    }
    if (cardId === 'unidades_aisladas') {
      this.focusMapLayer('aisladas');
      return;
    }
    if (cardId === 'pelotones') {
      this.showPelotonesModal = true;
      return;
    }
    if (cardId === 'exde') {
      this.showExdeModal = true;
      return;
    }
    if (cardId === 'cabo_cdt') {
      this.openGenericSummary('Cabo CDT', this.snapshot.caboCdt);
      return;
    }
    if (cardId === 'efectivos_disminuidos') {
      this.openGenericSummary('Efectivos disminuidos', this.snapshot.efectivosDisminuidos);
    }
  }

  seleccionarDivision(divisionId: string) {
    this.operationalFilters = {
      ...this.operationalFilters,
      division: divisionId === 'TODAS' ? 'TODAS' : divisionId
    };
    this.syncQuickFilters();
    this.tablePage = 1;
    this.rebuildDashboard();
  }

  onMapFeatureSelected(featureId: string) {
    this.selectedFeatureId = featureId;
    this.rebuildDashboard(false);
  }

  seleccionarFila(row: OperationalTableRow) {
    if (row.featureId) {
      this.selectedFeatureId = row.featureId;
    }
    this.rebuildDashboard(false);
  }

  verFilaEnMapa(row: OperationalTableRow, event: MouseEvent) {
    event.stopPropagation();
    if (row.featureId) {
      this.selectedFeatureId = row.featureId;
      this.rebuildDashboard(false);
    }
  }

  verFilaDetalle(row: OperationalTableRow, event: MouseEvent) {
    event.stopPropagation();
    this.selectedTableDetail = row;
    if (row.featureId) {
      this.selectedFeatureId = row.featureId;
      this.rebuildDashboard(false);
    }
    this.showDetailOverlay = true;
    this.cdr.markForCheck();
  }

  cerrarOverlays() {
    this.showPelotonesModal = false;
    this.showExdeModal = false;
    this.showGenericSummaryModal = false;
    this.showDetailOverlay = false;
    this.selectedTableDetail = null;
  }

  toggleLayer(layer: MapLayerKey) {
    this.layerVisibility[layer] = !this.layerVisibility[layer];
    this.activeMapFocus = 'all';
    this.rebuildDashboard(false);
  }

  exportarKmlVisible() {
    downloadVisibleKml(this.mapRenderModel, 'seguimiento-visible');
    this.exportStatus = 'KML generado con los elementos visibles.';
  }

  exportarGeoJsonVisible() {
    downloadVisibleGeoJson(this.mapRenderModel, 'seguimiento-visible');
    this.exportStatus = 'GeoJSON generado con los elementos visibles.';
  }

  exportarCsvVisible() {
    downloadVisibleCsv(this.mapRenderModel, 'seguimiento-visible');
    this.exportStatus = 'CSV generado con los elementos visibles.';
  }

  async exportarPngMapa() {
    const exported = await this.mapaOperacionalComponent?.exportAsPng('seguimiento-visible');
    this.exportStatus = exported ? 'PNG del mapa exportado correctamente.' : 'No fue posible generar el PNG del mapa.';
    this.cdr.markForCheck();
  }

  onTableSearchChange(value: string) {
    this.tableSearch = value;
    this.tablePage = 1;
    this.rebuildTableRows();
  }

  toggleTableSort(key: keyof OperationalTableRow) {
    if (this.tableSortKey === key) {
      this.tableSortDirection = this.tableSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.tableSortKey = key;
      this.tableSortDirection = key === 'timestamp' ? 'desc' : 'asc';
    }
    this.rebuildTableRows();
  }

  goToTablePage(delta: number) {
    this.tablePage = Math.min(this.totalTablePages, Math.max(1, this.tablePage + delta));
    this.rebuildTableRows(false);
  }

  private rebuildDashboard(updateSelection = true) {
    if (updateSelection) {
      this.selectedFeatureId = nextSelectedFeatureId(
        this.snapshot,
        this.operationalFilters,
        this.selectedCardId,
        this.selectedFeatureId
      );
    }

    this.dashboardVm = buildOperationalViewModel({
      snapshot: this.snapshot,
      filters: this.operationalFilters,
      selectedCardId: this.selectedCardId,
      selectedFeatureId: this.selectedFeatureId,
      refreshLabel: this.refreshLabel
    });
    this.mapRenderModel = this.buildVisibleMapModel(this.dashboardVm.mapModel);
    this.quickFilterSummary = buildQuickFilterSummary(this.operationalFilters);
    this.exdeBreakdown = buildSummaryByDivision(this.snapshot.exde.filter((item) => this.matchesOperationalFilters(item)), ['total_exde', 'total', 'cantidad']);
    this.pelotonBreakdown = buildPelotonStatusByDivision(this.snapshot.pelotones.filter((item) => this.matchesOperationalFilters(item)));
    this.summaryCards = this.buildSummaryCards();
    this.rebuildTableRows();
    this.cdr.markForCheck();
  }

  /**
   * Mantiene el CTA principal compacto y coherente con la cantidad de
   * restricciones visibles en la barra superior.
   */
  private updateQuickFilterButtonLabel() {
    const active = [
      this.quickDivisionValue !== 'TODAS',
      this.quickAlertValue !== 'TODAS',
      this.quickOperationValue !== 'TODAS',
      this.quickExdeValue !== 'TODOS'
    ].filter(Boolean).length;
    this.quickFilterButtonLabel = active ? `Filtrar (${active})` : 'Filtrar';
  }

  private rebuildTableRows(resetPage = true) {
    const term = this.tableSearch.trim().toLowerCase();
    const scopedRows = this.dashboardVm.tableRows.filter((row) => this.matchesCurrentMapScope(row));
    const filteredRows = term
      ? scopedRows.filter((row) =>
          [
            row.unidad,
            row.comandante,
            row.division,
            row.brigada,
            row.alerta,
            row.operacion,
            row.ubicacionLabel,
            row.timestamp
          ]
            .join(' ')
            .toLowerCase()
            .includes(term)
        )
      : [...scopedRows];

    filteredRows.sort((left, right) => this.compareRows(left, right));
    this.visibleTableRows = filteredRows;

    if (resetPage) {
      this.tablePage = 1;
    }

    this.totalTablePages = Math.max(1, Math.ceil(filteredRows.length / this.tablePageSize));
    this.tablePage = Math.min(this.tablePage, this.totalTablePages);

    const start = (this.tablePage - 1) * this.tablePageSize;
    const end = start + this.tablePageSize;
    this.currentTableRows = filteredRows.slice(start, end);
    this.tableRangeLabel = filteredRows.length
      ? `${start + 1}-${Math.min(end, filteredRows.length)} de ${filteredRows.length}`
      : '0-0 de 0';
  }

  private compareRows(left: OperationalTableRow, right: OperationalTableRow) {
    const leftValue = String(left[this.tableSortKey] ?? '');
    const rightValue = String(right[this.tableSortKey] ?? '');
    const result = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
    return this.tableSortDirection === 'asc' ? result : -result;
  }

  /**
   * Mantiene coherencia entre los filtros rápidos visibles y el panel avanzado.
   */
  private syncQuickFilters() {
    this.quickDivisionValue = this.operationalFilters.division;
    this.quickAlertValue = this.operationalFilters.alerta;
    this.quickOperationValue = this.operationalFilters.operacion;
    this.quickExdeValue = this.operationalFilters.exde;
    this.updateQuickFilterButtonLabel();
  }

  private applyPresetDates() {
    if (this.filtrosAvanzados.modoFecha !== 'preset') {
      return;
    }

    const end = new Date();
    const start = new Date(end);
    switch (this.filtrosAvanzados.preset) {
      case 'hoy':
        start.setHours(0, 0, 0, 0);
        break;
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '48h':
        start.setHours(start.getHours() - 48);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      default:
        break;
    }

    this.filtrosAvanzados.fechaInicial = this.formatDate(start);
    this.filtrosAvanzados.fechaFinal = this.formatDate(end);
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private syncModuleVisibility() {
    this.showKpis = this.modulos.find((item) => item.clave === 'indicadores')?.visible ?? true;
    this.showPanel = this.modulos.find((item) => item.clave === 'alertas')?.visible ?? true;
    this.showTable = this.modulos.find((item) => item.clave === 'eventos')?.visible ?? true;
  }

  private focusMapLayer(layer: MapLayerKey) {
    this.activeMapFocus = layer;
    this.layerVisibility.eventos = layer === 'eventos';
    this.layerVisibility.insitop = layer === 'insitop';
    this.layerVisibility.movimientos = layer === 'movimientos';
    this.layerVisibility.aisladas = layer === 'aisladas';
    this.rebuildDashboard(false);
  }

  private resetLayerVisibility() {
    this.activeMapFocus = 'all';
    this.layerVisibility.eventos = true;
    this.layerVisibility.insitop = true;
    this.layerVisibility.movimientos = true;
    this.layerVisibility.aisladas = true;
  }

  private buildVisibleMapModel(baseModel: OperationalMapRenderModel): OperationalMapRenderModel {
    const visibleFeatures = baseModel.features.filter((feature) => {
      if (feature.type === 'evento') return this.layerVisibility.eventos;
      if (feature.type === 'peloton') return this.layerVisibility.insitop;
      if (feature.type === 'aislada') return this.layerVisibility.aisladas;
      return true;
    });
    const visibleMovements = this.layerVisibility.movimientos ? baseModel.movements : [];

    return {
      ...baseModel,
      features: visibleFeatures,
      movements: visibleMovements,
      totals: {
        visibles: String(visibleFeatures.length),
        pelotones: String(visibleFeatures.filter((item) => item.type === 'peloton').length),
        alertas: String(visibleFeatures.filter((item) => item.type === 'evento').length),
        movimientos: String(visibleMovements.length)
      }
    };
  }

  private buildSummaryCards(): SummaryCardVm[] {
    return [
      {
        id: 'eventos',
        label: 'Eventos',
        value: String(this.mapRenderModel.features.filter((item) => item.type === 'evento').length),
        helper: 'Ver en mapa',
        mode: 'map',
        active: this.activeMapFocus === 'eventos'
      },
      {
        id: 'informacion_insitop',
        label: 'INSITOP',
        value: String(this.mapRenderModel.features.filter((item) => item.type === 'peloton').length),
        helper: 'Ver en mapa',
        mode: 'map',
        active: this.activeMapFocus === 'insitop'
      },
      {
        id: 'exde',
        label: 'EXDE',
        value: String(this.dashboardVm.visibleCounts.exde),
        helper: 'Ver detalle',
        mode: 'modal',
        active: false
      },
      {
        id: 'pelotones',
        label: 'Pelotones',
        value: String(this.dashboardVm.visibleCounts.pelotones),
        helper: 'Ver detalle',
        mode: 'modal',
        active: false
      },
      {
        id: 'movimientos',
        label: 'Movimientos',
        value: this.mapRenderModel.totals.movimientos,
        helper: 'Ver en mapa',
        mode: 'map',
        active: this.activeMapFocus === 'movimientos'
      },
      {
        id: 'unidades_aisladas',
        label: 'Aisladas',
        value: String(this.mapRenderModel.features.filter((item) => item.type === 'aislada').length),
        helper: 'Ver en mapa',
        mode: 'map',
        active: this.activeMapFocus === 'aisladas'
      },
      {
        id: 'cabo_cdt',
        label: 'Cabo CDT',
        value: String(this.snapshot.caboCdt.length),
        helper: 'Ver detalle',
        mode: 'modal',
        active: false
      },
      {
        id: 'efectivos_disminuidos',
        label: 'Efectivos',
        value: String(this.snapshot.efectivosDisminuidos.length),
        helper: 'Ver detalle',
        mode: 'modal',
        active: false
      }
    ];
  }

  private openGenericSummary(title: string, features: OperationalFeature[]) {
    this.genericSummaryTitle = title;
    this.genericSummaryRows = buildSummaryByDivision(features.filter((item) => this.matchesOperationalFilters(item)), ['total', 'cantidad']);
    this.showGenericSummaryModal = true;
    this.cdr.markForCheck();
  }

  private matchesCurrentMapScope(row: OperationalTableRow) {
    if (this.activeMapFocus === 'all') {
      return true;
    }
    if (this.activeMapFocus === 'movimientos') {
      return !!row.movementId;
    }
    if (this.activeMapFocus === 'eventos') {
      return !!row.featureId && row.alerta !== 'Movimiento';
    }
    if (this.activeMapFocus === 'insitop') {
      return !!row.featureId && row.comandante !== 'Movimiento' && row.operacion !== 'Ruta tactica';
    }
    if (this.activeMapFocus === 'aisladas') {
      return !!row.featureId && row.alerta.toUpperCase().includes('AISL');
    }
    return true;
  }

  /**
   * Replica la misma logica de filtros del dashboard para construir modales
   * de resumen sin recalcular nada dentro del template.
   */
  private matchesOperationalFilters(item: { division: string; brigada: string; unidad: string; departamento: string; municipio: string; alerta: string; operacion: string; exde: boolean }) {
    if (this.operationalFilters.division !== 'TODAS' && item.division !== this.operationalFilters.division) return false;
    if (this.operationalFilters.brigada !== 'TODAS' && item.brigada !== this.operationalFilters.brigada) return false;
    if (this.operationalFilters.unidad !== 'TODAS' && item.unidad !== this.operationalFilters.unidad) return false;
    if (this.operationalFilters.departamento !== 'TODOS' && item.departamento !== this.operationalFilters.departamento) return false;
    if (this.operationalFilters.municipio !== 'TODOS' && item.municipio !== this.operationalFilters.municipio) return false;
    if (this.operationalFilters.alerta !== 'TODAS' && item.alerta.toUpperCase() !== this.operationalFilters.alerta) return false;
    if (this.operationalFilters.operacion !== 'TODAS' && item.operacion !== this.operationalFilters.operacion) return false;
    if (this.operationalFilters.exde === 'SI' && !item.exde) return false;
    if (this.operationalFilters.exde === 'NO' && item.exde) return false;
    return true;
  }
}
