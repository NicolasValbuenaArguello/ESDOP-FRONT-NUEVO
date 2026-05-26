import { SidebarComponent } from "../../shared/sidebar/sidebar.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import html2canvas from 'html2canvas';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartData,
  Chart,
  registerables
} from 'chart.js';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { UnidadesTreeService } from '../../services/unidades-tree.service';
import { AuthService } from "../../services/auth";


@Component({
  selector: 'app-seguimiento-operacional',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    FormsModule,
    HttpClientModule,
    BaseChartDirective
  ],
  templateUrl: './seguimiento-operacional.html',
  styleUrls: ['./seguimiento-operacional.css'],
})

export class SeguimientoOperacional implements AfterViewInit {
  @ViewChild('leafletMap') leafletMapRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mapPanel') mapPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('mapCaptureSurface') mapCaptureSurfaceRef?: ElementRef<HTMLDivElement>;
  @ViewChild('panelExde')
  panelExde?: ElementRef;

  @ViewChild('panelPelotones')
  panelPelotones?: ElementRef;
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
  subregiones: any[] = [];
  subregionSeleccionada: any = null;
  departamentoSeleccionado: any = null;
  private map?: L.Map;
  private markerLayer: L.LayerGroup = L.layerGroup();
  private editableLayers: L.FeatureGroup = new L.FeatureGroup();
  private measurementLayer: L.FeatureGroup = new L.FeatureGroup();
  private measurementPoints: L.LatLng[] = [];
  private measurementLine?: L.Polyline;
  // =========================
  // MARCADOR SELECCIONADO
  // =========================

  markerSeleccionado: L.Layer | null = null;

  circuloSeleccionado: L.Circle | null = null;
  @ViewChild('panelTabla')

  panelTabla?: ElementRef;
  mostrarTabla = false;
  minimizado = false;
  filtroTexto = '';
  private dragging = false;
  private offsetX = 0;
  private offsetY = 0;

  sidebarVisible = true;

  mostrarFiltro = false;

  fechaSeleccionada = '';

  informacion: any[] = [];

  cargando = false;
  mostrarExde = false;
  mostrarPelotones = false;
  eventosLayer: L.LayerGroup = L.layerGroup();
  unidadesLayer: L.LayerGroup = L.layerGroup();
  lineasLayer: L.LayerGroup = L.layerGroup();

  insitopLayer: L.LayerGroup = L.layerGroup();

  mostrarInsitop = true;

  informacionInsitop: any[] = [];

  mostrarEventos = true;
  mostrarUnidades = true;
  mostrarLineas = true;

  informacionCaboCdt: any[] = [];

  caboCdtLayer: L.LayerGroup =
    L.layerGroup();

  mostrarCaboCdt = true;

  mostrarTablaCabo = false;

  filtroCabo = '';

  informacionEfectivos: any[] = [];

  efectivosLayer: L.LayerGroup =
    L.layerGroup();

  mostrarEfectivos = true;

  mostrarTablaEfectivos = false;

  filtroEfectivos = '';

  // ==========================
  // UNIDADES AISLADAS
  // ==========================

  informacionAisladas: any[] = [];

  aisladasLayer: L.LayerGroup =
    L.layerGroup();

  lineasAisladasLayer: L.LayerGroup =
    L.layerGroup();

  mostrarAisladas = true;

  mostrarTablaAisladas = false;

  filtroAisladas = '';

  // ==========================
  // MOVIMIENTOS
  // ==========================

  informacionMovimientos: any[] = [];
  movimientosData: any = {};

  movimientosActualesLayer: L.LayerGroup =
    L.layerGroup();

  movimientosAnterioresLayer: L.LayerGroup =
    L.layerGroup();

  lineasMovimientosLayer: L.LayerGroup =
    L.layerGroup();

  mostrarMovimientos = true;

  mostrarTablaMovimientos = false;

  filtroMovimientos = '';


  detalleMapa: any = null;
  mostrarVentanaDetalle = false;
  datosExde: any = {
    total_exde: 0,
    unidades: {}
  };
  datosPelotones: any = {
    total_pelotones: 0,
    operaciones: 0,
    entrenamiento: 0,
    descanso: 0,
    unidades: {}
  };

  detalleSeleccionado: any = null;

  barChartType: 'bar' = 'bar';

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'EXDE'
      }
    ]
  };
  barChartPelotonesData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  barChartOptions: ChartConfiguration<'bar'>['options'] = {

    responsive: true,

    maintainAspectRatio: false,

    plugins: {

      legend: {

        labels: {

          generateLabels: (chart) => {

            const datasets =
              chart.data.datasets;

            return datasets.map(
              (dataset: any, i) => ({

                text: dataset.label,

                fillStyle:
                  dataset.backgroundColor,

                strokeStyle:
                  dataset.backgroundColor,

                fontColor:
                  dataset.backgroundColor,

                hidden:
                  !chart.isDatasetVisible(i),

                datasetIndex: i

              })
            );

          }

        }

      }

    },

    scales: {

      x: {

        ticks: {

          color: '#ffffff'

        }

      },

      y: {

        beginAtZero: true,

        ticks: {

          color: '#ffffff'

        }

      }

    }

  };


  constructor(
    private http: HttpClient,
        private auth: AuthService,
        private unidadesTreeService: UnidadesTreeService,
        private cd: ChangeDetectorRef
  ) {
    Chart.register(...registerables);
    this.cargarOpcionesSubFiltrosDesdeUsuario();
  }
  mostrarGraficaGrande = false;
  
  seleccionarSubregion(sub: any) {
    this.subregionSeleccionada = sub;
    this.departamentoSeleccionado = null;
  }

  seleccionarDepartamento(dep: any) {
    this.departamentoSeleccionado = dep;
  }
  onSubFiltroDepartamentoChange() {
    this.filtrosForm.subFiltroMunicipio = [];
    this.actualizarOpcionesLugar();
  }

  onSubFiltroMunicipioChange() {
    this.actualizarOpcionesLugar();
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
    private cargarOpcionesSubFiltrosDesdeUsuario() {
    const registros = this.unidadesTreeService.normalizarRegistros(this.auth.obtenerUnidadesUsuario());
    const divisionesFt = registros.map((item) => item.agr_div);

    this.opcionesSubFiltros.divisiones_ft = Array.from(new Set(divisionesFt)).sort((a, b) => a.localeCompare(b));
    this.actualizarOpcionesSubFiltrosOperativos();
    this.actualizarOpcionesLugar();
    this.subregiones = this.auth.obtenerSubRegionesUsuario();
    

    // OPERACIONES: Obtener el catálogo plano de operaciones igual que enemigo
    
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
  // =========================
  // RENDERIZAR UNIDADES AISLADAS
  // =========================
  renderizarAisladas(): void {

    if (!this.map) return;

    this.aisladasLayer.clearLayers();

    this.lineasAisladasLayer.clearLayers();

    for (const item of this.informacionAisladas) {

      const latAislada =
        Number(item[12]);

      const lonAislada =
        Number(item[13]);

      const latVecino =
        Number(item[17]);

      const lonVecino =
        Number(item[18]);

      // =========================
      // VALIDAR
      // =========================

      if (
        isNaN(latAislada) ||
        isNaN(lonAislada) ||
        isNaN(latVecino) ||
        isNaN(lonVecino)
      ) {
        continue;
      }

      // EVITAR MISMA POSICIÓN

      if (
        latAislada === latVecino &&
        lonAislada === lonVecino
      ) {
        continue;
      }

      // =========================
      // PUNTOS INDEPENDIENTES
      // =========================

      const puntoAislado =
        L.latLng(
          latAislada,
          lonAislada
        );

      const puntoVecino =
        L.latLng(
          latVecino,
          lonVecino
        );

      // =========================
      // AISLADA
      // =========================

      const markerAislada =
        L.circleMarker(
          puntoAislado,
          {
            radius: 9,
            color: '#ff1744',
            fillColor: '#ff1744',
            fillOpacity: 1,
            weight: 3
          }
        );

      markerAislada.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header danger-header">

    UNIDAD AISLADA

    <span>

      ${item[0] || ''} - ${item[1] || ''} - ${item[2] || ''}  - ${item[3] || ''}  - ${item[4] || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <div class="mini-item">

      <small>UNIDAD</small>

      <strong>
        ${item[0] || ''} - ${item[1] || ''} - ${item[2] || ''}  - ${item[3] || ''}  - ${item[4] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>COMANDANTE</small>

      <strong>
        ${item[7] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>DISTANCIA</small>

      <strong>
        ${item[8] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>MUNICIPIO</small>

      <strong>
        ${item[6] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>UNIDAD MÁS CERCANA</small>

      <strong>
        ${item[15] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>COMANDANTE VECINO</small>

      <strong>
        ${item[16] || ''}
      </strong>

    </div>

  </div>

</div>

`);
      this.aisladasLayer
        .addLayer(markerAislada);

      // =========================
      // VECINA
      // =========================

      const markerVecino =
        L.circleMarker(
          puntoVecino,
          {
            radius: 8,
            color: '#00e676',
            fillColor: '#00e676',
            fillOpacity: 1,
            weight: 2
          }
        );

      markerVecino.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header success-header">

    UNIDAD MÁS CERCANA

    <span>

      ${item[15] || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <div class="mini-item">

      <small>UNIDAD</small>

      <strong>
        ${item[15] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>COMANDANTE</small>

      <strong>
        ${item[16] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>LATITUD</small>

      <strong>
        ${item[17] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>LONGITUD</small>

      <strong>
        ${item[18] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>RELACIÓN</small>

      <strong>
        UNIDAD DE APOYO MÁS CERCANA
      </strong>

    </div>

  </div>

</div>

`);
      this.aisladasLayer
        .addLayer(markerVecino);

      // =========================
      // SOLO UNA LINEA
      // =========================

      const linea =
        L.polyline(
          [
            puntoAislado,
            puntoVecino
          ],
          {
            color: '#ffd600',
            weight: 2,
            opacity: 0.9,
            dashArray: '6,6'
          }
        );

      this.lineasAisladasLayer
        .addLayer(linea);

    }

  }

  renderizarEfectivos(): void {

    if (!this.map) return;

    this.efectivosLayer.clearLayers();

    for (const item of this.informacionEfectivos) {

      const lat = Number(item[8]);
      const lon = Number(item[9]);

      if (
        isNaN(lat) ||
        isNaN(lon)
      ) continue;

      // =========================
      // COLOR
      // =========================

      let color = '#00e676';

      if (item[13] === 'Operaciones') {
        color = '#ff1744';
      }

      if (item[13] === 'Descanso') {
        color = '#2979ff';
      }

      if (item[13] === 'Entrenamiento') {
        color = '#ff9100';
      }

      // =========================
      // ICONO
      // =========================

      const marker = L.circleMarker(
        [lat, lon],
        {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2
        }
      );

      // =========================
      // POPUP
      // =========================

      marker.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header warning-header">

    EFECTIVOS DISMINUIDOS

    <span>

      ${item[2] || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <div class="mini-item">

      <small>DIVISIÓN</small>

      <strong>
        ${item[0] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>BRIGADA</small>

      <strong>
        ${item[1] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>UNIDAD</small>

      <strong>
        ${item[2] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>COMPAÑÍA</small>

      <strong>
        ${item[3] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>PELOTÓN</small>

      <strong>
        ${item[4] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>MUNICIPIO</small>

      <strong>
        ${item[5] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>COMANDANTE</small>

      <strong>
        ${item[7] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>EFECTIVOS</small>

      <strong class="danger-text">
        ${item[10] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>ESTADO</small>

      <strong>
        ${item[13] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>OBSERVACIÓN</small>

      <strong>
        ${item[14] || ''}
      </strong>

    </div>

  </div>

</div>

`);

      // =========================
      // TOOLTIP
      // =========================

      marker.bindTooltip(
        `
      ${item[2]}
      -
      ${item[13]}
      `,
        {
          direction: 'top'
        }
      );

      this.efectivosLayer.addLayer(marker);

    }

  }
    renderizarCaboCdt(): void {

    if (!this.map) return;

    this.caboCdtLayer.clearLayers();

    for (const item of this.informacionCaboCdt) {

      const lat = Number(item[13]);
      const lon = Number(item[14]);

      if (
        isNaN(lat) ||
        isNaN(lon)
      ) continue;

      let color = '#00e5ff';

      if (item[12] === 'Operaciones') {
        color = '#ff1744';
      }

      if (item[12] === 'Entrenamiento') {
        color = '#ff9100';
      }

      if (item[12] === 'Descanso') {
        color = '#2979ff';
      }

      const marker = L.circleMarker(
        [lat, lon],
        {
          radius: 7,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2
        }
      );

marker.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header primary-header">

    CABO CDT

    <span>

      ${item[2] || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <div class="mini-item">

      <small>DIVISIÓN</small>

      <strong>
        ${item[0] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>BRIGADA</small>

      <strong>
        ${item[1] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>UNIDAD</small>

      <strong>
        ${item[2] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>ARMA</small>

      <strong>
        ${item[3] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>PELOTÓN</small>

      <strong>
        ${item[4] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>MUNICIPIO</small>

      <strong>
        ${item[5] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>COMPAÑÍA</small>

      <strong>
        ${item[7] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>COMANDANTE</small>

      <strong>
        ${item[8] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>CELULAR</small>

      <strong>
        ${item[9] || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>EFECTIVOS</small>

      <strong class="success-text">
        ${item[10] || ''}
      </strong>

    </div>

    <div class="mini-item full">

      <small>ESTADO</small>

      <strong>
        ${item[12] || ''}
      </strong>

    </div>

  </div>

</div>

`);

      marker.bindTooltip(
        `
      ${item[2]}
      -
      ${item[12]}
      `,
        {
          direction: 'top'
        }
      );

      this.caboCdtLayer.addLayer(marker);

    }

  }
    renderizarInsitop(): void {

    if (!this.map) return;

    this.insitopLayer.clearLayers();

    for (const item of this.informacionInsitop) {

      if (
        !item.latitud ||
        !item.longitud
      ) {
        continue;
      }

      const lat = Number(item.latitud);
      const lon = Number(item.longitud);

      if (
        isNaN(lat) ||
        isNaN(lon)
      ) {
        continue;
      }

      // ==========================
      // COLOR POR ESTADO
      // ==========================

      let color = '#00c853';

      if (item.code === 'Operaciones') {
        color = '#ff0000';
      }

      if (item.code === 'Entrenamiento') {
        color = '#ff9800';
      }

      if (item.code === 'Descanso') {
        color = '#2196f3';
      }

      // ==========================
      // MARCADOR
      // ==========================

      const marker = L.circleMarker(
        [lat, lon],
        {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2
        }
      );

      // ==========================
      // POPUP
      // ==========================

      marker.bindPopup(`

<div class="popup-mini">

  <div class="popup-mini-header">

    INSITOP

    <span>

      ${item.compania || ''}

      ·

      ${item.peloton || ''}

      <br>
      ${item.fecha_insitop || ''}

    </span>

  </div>

  <div class="popup-mini-grid">

    <div class="mini-item">

      <small>UNIDAD</small>

      <strong>
        ${item.sigla_division || ''} -
        ${item.sigla_brigada || ''} - 
        ${item.sigla_unidd || ''}
      </strong>
      <br>
      <small>RELACIÓN</small>

      <strong>
        ${item.relacion_de_mando || ''} 
      </strong>

    </div>


    <div class="mini-item">

      <small>COMANDANTE</small>

      <strong>
        ${item.comandante || ''}
      </strong>
      <br>
      <strong>
        ${item.celular_comandante || ''}
      </strong>

    </div>

    <div class="mini-item">

      <small>EFECTIVOS</small>

      <strong>
        ${item.total_soldados || '0'}
      </strong>
      <br>
      <strong>
        (${item.oficiales || '0'}-${item.suboficiales || '0'}-${item.slp || '0'}-${item.sl18 || '0'}-${item.sl2 || '0'})
      </strong>

      <br>
      <small>EXDE</small>

      <strong>
        ${item.exde || ''}
      </strong>

    </div>

<div class="mini-item">

  <small>LUGAR</small>

  <strong>
    ${item.departamento || ''}
    ${item.municipio || ''}
    ${item.lugar || ''}
  </strong>

  <small>COORDENADAS</small>

  <strong>

    ${this.convertirCoordenadas(
        item.latitud,
        item.longitud
      )?.geografica?.latitud
        }

    <br>

    ${this.convertirCoordenadas(
          item.latitud,
          item.longitud
        )?.geografica?.longitud
        }

  </strong>

  <small>MILITAR</small>

  <strong>

    ${this.convertirCoordenadas(
          item.latitud,
          item.longitud
        )?.militar?.mgrs
        }

  </strong>

</div>


<div class="mini-item full">

  <small>OPERACIONAL</small>

  <div class="tags-operacionales">

    <span class="tag-op danger">
      ${item.code || ''}
    </span>

    <span class="tag-op">
      ${item.linea_de_operaciones || ''}
    </span>

    <span class="tag-op blue">
      ${item.operacion || ''}
    </span>

    <span class="tag-op orange">
      ${item.tareas_accion_decisiva_ttf || ''}
    </span>

    <span class="tag-op">
      ${item.tarea || ''}
    </span>

    <span class="tag-op green">
      ${item.tecnicas_actividades || ''}
    </span>

    <span class="tag-op purple">
      ${item.tarea_especial || ''}
    </span>

    <span class="tag-op gray">
      ${item.ord_esc_bat || ''}
    </span>

  </div>

</div>

    <div class="mini-item full">

      <small>TAREA</small>

      <strong>
        ${item.observaciones || ''}
      </strong>

    </div>

  </div>

</div>

`);

      // ==========================
      // TOOLTIP
      // ==========================

      marker.bindTooltip(
        `
      ${item.sigla_unidd}
      -
      ${item.code}
      `,
        {
          permanent: false,
          direction: 'top'
        }
      );

      this.insitopLayer.addLayer(marker);

    }

  }

  renderizarMovimientos(): void {

    if (!this.map) return;

    // =========================
    // LIMPIAR
    // =========================

    this.informacionMovimientos = [];

    this.movimientosActualesLayer.clearLayers();

    this.movimientosAnterioresLayer.clearLayers();

    this.lineasMovimientosLayer.clearLayers();

    // =========================
    // RECORRER
    // =========================

    for (const division in this.movimientosData) {

      const grupo =
        this.movimientosData[division];

      if (!grupo?.unidades) continue;

      for (const item of grupo.unidades) {

        const actual =
          item.coordenada_actual;

        const anterior =
          item.coordenada_anterior;

        if (!actual || !anterior) continue;

        const latActual =
          Number(actual.latitud);

        const lonActual =
          Number(actual.longitud);

        const latAnterior =
          Number(anterior.latitud);

        const lonAnterior =
          Number(anterior.longitud);

        // =========================
        // VALIDAR
        // =========================

        if (
          isNaN(latActual) ||
          isNaN(lonActual) ||
          isNaN(latAnterior) ||
          isNaN(lonAnterior)
        ) {
          continue;
        }

        // EVITAR MISMA COORDENADA

        if (
          latActual === latAnterior &&
          lonActual === lonAnterior
        ) {
          continue;
        }

        // =========================
        // LATLNG INDEPENDIENTES
        // =========================

        const puntoActual =
          L.latLng(latActual, lonActual);

        const puntoAnterior =
          L.latLng(latAnterior, lonAnterior);

        // =========================
        // MARCADOR ACTUAL
        // =========================

        const markerActual =
          L.circleMarker(
            puntoActual,
            {
              radius: 9,
              color: '#00e676',
              fillColor: '#00e676',
              fillOpacity: 1,
              weight: 3
            }
          );

markerActual.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header current-header">

    POSICIÓN ACTUAL

    <span>

      ${item.unidad || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <!-- FECHA -->

    <div class="mini-item">

      <small>FECHA</small>

      <strong>
        ${actual.fecha || ''}
      </strong>

    </div>

    <!-- DISTANCIA -->

    <div class="mini-item">

      <small>DISTANCIA</small>

      <strong class="distance-text">
        ${item.distancia_metros || '0'} m
      </strong>

    </div>

    <!-- DIVISION -->

    <div class="mini-item">

      <small>DIVISIÓN</small>

      <strong>
        ${item.division || ''}
      </strong>

    </div>

    <!-- BRIGADA -->

    <div class="mini-item">

      <small>BRIGADA</small>

      <strong>
        ${item.brigada || ''}
      </strong>

    </div>

    <!-- UNIDAD -->

    <div class="mini-item">

      <small>UNIDAD</small>

      <strong>
        ${item.unidad || ''}
      </strong>

    </div>

    <!-- COMPAÑIA -->

    <div class="mini-item">

      <small>COMPAÑÍA</small>

      <strong>
        ${item.compania || ''}
      </strong>

    </div>

    <!-- PELOTON -->

    <div class="mini-item full">

      <small>PELOTÓN</small>

      <strong>
        ${item.peloton || ''}
      </strong>

    </div>

    <!-- COORDENADAS -->

    <div class="mini-item full">

      <small>COORDENADAS</small>

      <strong>

        ${
          this.convertirCoordenadas(
            latActual,
            lonActual
          )?.geografica?.latitud || ''
        }

        <br>

        ${
          this.convertirCoordenadas(
            latActual,
            lonActual
          )?.geografica?.longitud || ''
        }

      </strong>

    </div>

    <!-- MILITAR -->

    <div class="mini-item full">

      <small>MILITAR</small>

      <strong class="military-text">

        ${
          this.convertirCoordenadas(
            latActual,
            lonActual
          )?.militar?.mgrs || ''
        }

      </strong>

    </div>

  </div>

</div>

`);

        this.movimientosActualesLayer
          .addLayer(markerActual);

        // =========================
        // MARCADOR ANTERIOR
        // =========================

        const markerAnterior =
          L.circleMarker(
            puntoAnterior,
            {
              radius: 8,
              color: '#ff9100',
              fillColor: '#ff9100',
              fillOpacity: 1,
              weight: 2
            }
          );

markerAnterior.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header previous-header">

    POSICIÓN ANTERIOR

    <span>

      ${item.unidad || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <!-- UNIDAD -->

    <div class="mini-item full">

      <small>UNIDAD</small>

      <strong>
        ${item.unidad || ''}
      </strong>

    </div>

    <!-- FECHA -->

    <div class="mini-item">

      <small>FECHA</small>

      <strong>
        ${anterior.fecha || ''}
      </strong>

    </div>

    <!-- COORDENADAS -->

    <div class="mini-item full">

      <small>COORDENADAS</small>

      <strong>

        ${
          this.convertirCoordenadas(
            latAnterior,
            lonAnterior
          )?.geografica?.latitud || ''
        }

        <br>

        ${
          this.convertirCoordenadas(
            latAnterior,
            lonAnterior
          )?.geografica?.longitud || ''
        }

      </strong>

    </div>

    <!-- MILITAR -->

    <div class="mini-item full">

      <small>MILITAR</small>

      <strong class="military-text">

        ${
          this.convertirCoordenadas(
            latAnterior,
            lonAnterior
          )?.militar?.mgrs || ''
        }

      </strong>

    </div>

  </div>

</div>

`);

        this.movimientosAnterioresLayer
          .addLayer(markerAnterior);

        // =========================
        // LINEA SOLO ENTRE ESOS DOS
        // =========================

        const linea =
          L.polyline(
            [
              puntoAnterior,
              puntoActual
            ],
            {
              color: '#00b0ff',
              weight: 3,
              opacity: 0.9,
              dashArray: '8,8'
            }
          );

        this.lineasMovimientosLayer
          .addLayer(linea);

        this.informacionMovimientos
          .push(item);

      }

    }

  }
  renderizarPuntos(): void {

    if (!this.map) return;

    this.eventosLayer.clearLayers();
    this.unidadesLayer.clearLayers();
    this.lineasLayer.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    // console.log('DATOS:', this.informacion);

    for (const item of this.informacion) {

      // VALIDAR CAMPOS
      if (
        !item.hop_lat ||
        !item.hop_lon ||
        !item.unidad_latitud ||
        !item.unidad_longitud
      ) {
        console.warn('Coordenadas vacías:', item);
        continue;
      }

      const hopLat = Number(item.hop_lat);
      const hopLon = Number(item.hop_lon);

      const unidadLat = Number(item.unidad_latitud);
      const unidadLon = Number(item.unidad_longitud);

      // VALIDAR NaN
      if (
        isNaN(hopLat) ||
        isNaN(hopLon) ||
        isNaN(unidadLat) ||
        isNaN(unidadLon)
      ) {
        console.warn('Coordenadas inválidas:', item);
        continue;
      }

      //console.log('EVENTO:', hopLat, hopLon);
      //console.log('UNIDAD:', unidadLat, unidadLon);

      bounds.push([hopLat, hopLon]);
      bounds.push([unidadLat, unidadLon]);

      // ==========================
      // ICONO EVENTO
      // ==========================

      const markerEvento = L.circleMarker(
        [hopLat, hopLon],
        {
          radius: 8,
          color: '#ff0000',
          fillColor: '#ff0000',
          fillOpacity: 1
        }
      );

markerEvento.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header event-header">

    EVENTO OPERACIONAL

    <span>

      ${item.hr || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <!-- EVENTO -->

    <div class="mini-item full">

      <small>EVENTO</small>

      <strong>
        ${item.res_accion || ''}
      </strong>

    </div>

    <!-- LUGAR -->

    <div class="mini-item full">

      <small>LUGAR</small>

      <strong>

        ${item.hop_depto || ''}

        ${item.hop_mpio || ''}

        ${item.hop_lugar || ''}

        ${item.hop_sitio || ''}

      </strong>

    </div>

    <!-- FECHA -->

    <div class="mini-item">

      <small>FECHA</small>

      <strong>
        ${item.hop_fecha_hecho || ''}
      </strong>

    </div>

    <!-- HORA -->

    <div class="mini-item">

      <small>HORA</small>

      <strong>
        ${item.hop_hora_hecho || ''}
      </strong>

    </div>

    <!-- HR -->

    <div class="mini-item">

      <small>HR</small>

      <strong class="event-text">
        ${item.hr || ''}
      </strong>

    </div>

    <!-- ENEMIGO -->

    <div class="mini-item">

      <small>ENEMIGO</small>

      <strong>
        ${item.hop_enemigo || ''}
      </strong>

    </div>

    <!-- COORDENADAS -->

    <div class="mini-item full">

      <small>COORDENADAS</small>

      <strong>

        ${
          this.convertirCoordenadas(
            item.hop_lat,
            item.hop_lon
          )?.geografica?.latitud || ''
        }

        <br>

        ${
          this.convertirCoordenadas(
            item.hop_lat,
            item.hop_lon
          )?.geografica?.longitud || ''
        }

      </strong>

    </div>

    <!-- MILITAR -->

    <div class="mini-item full">

      <small>MILITAR</small>

      <strong class="military-text">

        ${
          this.convertirCoordenadas(
            item.hop_lat,
            item.hop_lon
          )?.militar?.mgrs || ''
        }

      </strong>

    </div>

  </div>

</div>

`);

      this.eventosLayer.addLayer(markerEvento);

      // ==========================
      // ICONO UNIDAD
      // ==========================

      const markerUnidad = L.circleMarker(
        [unidadLat, unidadLon],
        {
          radius: 7,
          color: '#0066ff',
          fillColor: '#0066ff',
          fillOpacity: 1
        }
      );

markerUnidad.bindPopup(`

<div class="popup-mini">

  <!-- HEADER -->

  <div class="popup-mini-header unit-header">

    UNIDAD OPERACIONAL

    <span>

      ${item.unidad_operacional || ''}

    </span>

  </div>

  <!-- GRID -->

  <div class="popup-mini-grid">

    <!-- FECHA -->

    <div class="mini-item">

      <small>FECHA</small>

      <strong>
        ${item.fecha_insitop || ''}
      </strong>

    </div>

    <!-- ALERTA -->

    <div class="mini-item">

      <small>ALERTA</small>

      <strong class="alert-text">
        ${item.alerta || ''}
      </strong>

    </div>

    <!-- COMANDANTE -->

    <div class="mini-item full">

      <small>COMANDANTE</small>

      <strong>
        ${item.comandante || ''}
      </strong>

      <span class="mini-sub">

        ${item.celular_comandante || ''}

      </span>

    </div>

    <!-- EFECTIVOS -->

    <div class="mini-item full">

      <small>EFECTIVOS</small>

      <div class="tags-operacionales">

        <span class="tag-op blue">
          OF:
          ${item.oficiales || '0'}
        </span>

        <span class="tag-op green">
          SUB:
          ${item.suboficiales || '0'}
        </span>

        <span class="tag-op orange">
          SLP:
          ${item.slp || '0'}
        </span>

        <span class="tag-op purple">
          SL18:
          ${item.sl18 || '0'}
        </span>

        <span class="tag-op danger">
          SL12:
          ${item.sl12 || '0'}
        </span>

      </div>

    </div>

    <!-- EXDE -->

    <div class="mini-item">

      <small>EXDE</small>

      <strong>
        ${item.exde || ''}
      </strong>

    </div>

    <!-- DISTANCIA -->

    <div class="mini-item">

      <small>DISTANCIA</small>

      <strong>
        ${item.distancia_metros || ''}
      </strong>

    </div>

    <!-- INCIDENCIAS -->

    <div class="mini-item full">

      <small>INCIDENCIAS SECTOR</small>

      <strong class="event-text">
        ${item.total_incidencias_sector || ''}
      </strong>

    </div>

    <!-- COORDENADAS -->

    <div class="mini-item full">

      <small>COORDENADAS</small>

      <strong>

        ${
          this.convertirCoordenadas(
            item.unidad_latitud,
            item.unidad_longitud
          )?.geografica?.latitud || ''
        }

        <br>

        ${
          this.convertirCoordenadas(
            item.unidad_latitud,
            item.unidad_longitud
          )?.geografica?.longitud || ''
        }

      </strong>

    </div>

    <!-- MILITAR -->

    <div class="mini-item full">

      <small>MILITAR</small>

      <strong class="military-text">

        ${
          this.convertirCoordenadas(
            item.unidad_latitud,
            item.unidad_longitud
          )?.militar?.mgrs || ''
        }

      </strong>

    </div>

  </div>

</div>

`);
      this.unidadesLayer.addLayer(markerUnidad);

      // ==========================
      // LINEA
      // ==========================

      const linea = L.polyline(
        [
          [hopLat, hopLon],
          [unidadLat, unidadLon]
        ],
        {
          color: '#ffaa00',
          weight: 2
        }
      );

      this.lineasLayer.addLayer(linea);

    }

    // ==========================
    // AJUSTAR MAPA
    // ==========================

    if (bounds.length > 0) {

      this.map.fitBounds(bounds, {
        padding: [50, 50]
      });

    } else {

      console.error('NO HAY PUNTOS VALIDOS');

    }

  }

  toggleEventos(): void {

    this.mostrarEventos = !this.mostrarEventos;

    if (this.mostrarEventos) {

      this.map?.addLayer(this.eventosLayer);

    } else {

      this.map?.removeLayer(this.eventosLayer);

    }

  }

  abrirGraficaGrande(): void {

    this.mostrarGraficaGrande = true;

  }
  convertirCoordenadas(
    latitud: string | number,
    longitud: string | number
  ): any {

    // ========================================
    // DECIMALES
    // ========================================

    const lat =
      Number(latitud);

    const lon =
      Number(longitud);

    if (
      isNaN(lat) ||
      isNaN(lon)
    ) {

      return null;

    }

    // ========================================
    // GRADOS MINUTOS SEGUNDOS
    // ========================================

    const decimalAGMS = (
      decimal: number,
      tipo: 'lat' | 'lon'
    ) => {

      const absoluto =
        Math.abs(decimal);

      const grados =
        Math.floor(absoluto);

      const minutosFloat =
        (absoluto - grados) * 60;

      const minutos =
        Math.floor(minutosFloat);

      const segundos =
        (
          (minutosFloat - minutos) * 60
        ).toFixed(2);

      let direccion = '';

      if (tipo === 'lat') {

        direccion =
          decimal >= 0 ? 'N' : 'S';

      } else {

        direccion =
          decimal >= 0 ? 'E' : 'W';

      }

      return `${grados}° ${minutos}' ${segundos}" ${direccion}`;

    };

    // ========================================
    // UTM / MILITAR
    // ========================================

    const convertirUTM = (
      lat: number,
      lon: number
    ) => {

      const zone =
        Math.floor((lon + 180) / 6) + 1;

      const a = 6378137.0;
      const eccSquared = 0.00669438;
      const k0 = 0.9996;

      const latRad =
        lat * Math.PI / 180;

      const lonRad =
        lon * Math.PI / 180;

      const lonOrigin =
        (zone - 1) * 6 - 180 + 3;

      const lonOriginRad =
        lonOrigin * Math.PI / 180;

      const eccPrimeSquared =
        eccSquared / (1 - eccSquared);

      const N =
        a / Math.sqrt(
          1 -
          eccSquared *
          Math.sin(latRad) *
          Math.sin(latRad)
        );

      const T =
        Math.tan(latRad) *
        Math.tan(latRad);

      const C =
        eccPrimeSquared *
        Math.cos(latRad) *
        Math.cos(latRad);

      const A =
        Math.cos(latRad) *
        (lonRad - lonOriginRad);

      const M =
        a * (
          (1
            - eccSquared / 4
            - 3 * eccSquared * eccSquared / 64
            - 5 * eccSquared * eccSquared * eccSquared / 256)
          * latRad
          -
          (3 * eccSquared / 8
            + 3 * eccSquared * eccSquared / 32
            + 45 * eccSquared * eccSquared * eccSquared / 1024)
          * Math.sin(2 * latRad)
          +
          (15 * eccSquared * eccSquared / 256
            + 45 * eccSquared * eccSquared * eccSquared / 1024)
          * Math.sin(4 * latRad)
          -
          (35 * eccSquared * eccSquared * eccSquared / 3072)
          * Math.sin(6 * latRad)
        );

      let easting =
        (
          k0 *
          N *
          (
            A +
            (1 - T + C) *
            Math.pow(A, 3) / 6
          )
          + 500000.0
        );

      let northing =
        (
          k0 *
          (
            M +
            N *
            Math.tan(latRad) *
            (
              Math.pow(A, 2) / 2
            )
          )
        );

      if (lat < 0) {

        northing += 10000000.0;

      }

      return {

        zona: zone,

        este:
          Math.round(easting),

        norte:
          Math.round(northing)

      };

    };

    // ========================================
    // RESULTADO
    // ========================================

    const utm =
      convertirUTM(lat, lon);

    return {

      decimal: {

        latitud: lat,

        longitud: lon

      },

      geografica: {

        latitud:
          decimalAGMS(lat, 'lat'),

        longitud:
          decimalAGMS(lon, 'lon')

      },

      militar: {

        zona:
          utm.zona,

        este:
          utm.este,

        norte:
          utm.norte,

        mgrs:
          `${utm.zona} ${utm.este} ${utm.norte}`

      }

    };

  }
  cerrarGraficaGrande(): void {

    this.mostrarGraficaGrande = false;

  }
  ngAfterViewInit(): void {

    this.initializeMap();

  }
  initializeMap(): void {

    const host =
      this.leafletMapRef?.nativeElement;

    if (!host) return;

    this.map = L.map(host, {
      zoomControl: true
    }).setView(
      [4.5709, -74.2973],
      5
    );

    // =========================
    // AGREGAR CAPAS DESPUÉS
    // =========================

    this.eventosLayer.addTo(this.map);
    this.unidadesLayer.addTo(this.map);
    this.lineasLayer.addTo(this.map);
    this.insitopLayer.addTo(this.map);
    this.caboCdtLayer.addTo(this.map);
    this.efectivosLayer.addTo(this.map);
    this.aisladasLayer.addTo(this.map);
    this.movimientosActualesLayer.addTo(this.map);

    this.movimientosAnterioresLayer.addTo(this.map);

    this.lineasMovimientosLayer.addTo(this.map);

    this.lineasAisladasLayer.addTo(this.map);

    const calles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: 'OpenStreetMap'
      }
    );

    const satelital = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri'
      }
    );

    calles.addTo(this.map);

    L.control.layers(
      {
        Calles: calles,
        Satelital: satelital
      },
      {
        Eventos: this.eventosLayer,
        Unidades: this.unidadesLayer,
        Lineas: this.lineasLayer,
        INSITOP: this.insitopLayer,
        CABO_CDT: this.caboCdtLayer,
        EFECTIVOS: this.efectivosLayer,
        AISLADAS: this.aisladasLayer,


        MOV_ACTUALES:
          this.movimientosActualesLayer,

        MOV_ANTERIORES:
          this.movimientosAnterioresLayer,

        MOV_LINEAS:
          this.lineasMovimientosLayer,
        RELACIONES_AISLADAS:
          this.lineasAisladasLayer
      }
    ).addTo(this.map);

    this.markerLayer.addTo(this.map);

    this.editableLayers.addTo(this.map);

    const drawControl =
      new (L.Control as any).Draw({

        edit: {
          featureGroup:
            this.editableLayers
        },

        draw: {

          polygon: {},
          rectangle: {},
          circle: {},
          marker: {},
          polyline: {}

        }

      });

    this.map.addControl(drawControl);

    this.map.on(
      'draw:created',
      (e: any) => {

        this.editableLayers.addLayer(
          e.layer
        );

      }
    );

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 500);

  }


  toggleMovimientos(): void {

    this.mostrarMovimientos =
      !this.mostrarMovimientos;

    if (this.mostrarMovimientos) {

      this.map?.addLayer(
        this.movimientosActualesLayer
      );

      this.map?.addLayer(
        this.movimientosAnterioresLayer
      );

      this.map?.addLayer(
        this.lineasMovimientosLayer
      );

    } else {

      this.map?.removeLayer(
        this.movimientosActualesLayer
      );

      this.map?.removeLayer(
        this.movimientosAnterioresLayer
      );

      this.map?.removeLayer(
        this.lineasMovimientosLayer
      );

    }

  }
  irMovimientoMapa(item: any): void {

    if (!this.map) return;

    const actual =
      item.coordenada_actual;

    if (!actual) return;

    const lat =
      Number(actual.latitud);

    const lon =
      Number(actual.longitud);
    this.resaltarPunto(
      lat,
      lon,
      '#00e676'
    );
    if (
      isNaN(lat) ||
      isNaN(lon)
    ) return;

    this.map.setView(
      [lat, lon],
      13,
      {
        animate: true
      }
    );

  }


  toggleAisladas(): void {

    this.mostrarAisladas =
      !this.mostrarAisladas;

    if (this.mostrarAisladas) {

      this.map?.addLayer(
        this.aisladasLayer
      );

      this.map?.addLayer(
        this.lineasAisladasLayer
      );

    } else {

      this.map?.removeLayer(
        this.aisladasLayer
      );

      this.map?.removeLayer(
        this.lineasAisladasLayer
      );

    }

  }
  irAisladaMapa(item: any): void {

    if (!this.map) return;

    const lat =
      Number(item[12]);

    const lon =
      Number(item[13]);

    if (
      isNaN(lat) ||
      isNaN(lon)
    ) return;
    this.resaltarPunto(
      lat,
      lon,
      '#ffd600'
    );
    this.map.setView(
      [lat, lon],
      12,
      {
        animate: true
      }
    );

  }


  toggleUnidades(): void {

    this.mostrarUnidades = !this.mostrarUnidades;

    if (this.mostrarUnidades) {

      this.map?.addLayer(this.unidadesLayer);

    } else {

      this.map?.removeLayer(this.unidadesLayer);

    }

  }

  toggleLineas(): void {

    this.mostrarLineas = !this.mostrarLineas;

    if (this.mostrarLineas) {

      this.map?.addLayer(this.lineasLayer);

    } else {

      this.map?.removeLayer(this.lineasLayer);

    }

  }
  toggleInsitop(): void {

    this.mostrarInsitop =
      !this.mostrarInsitop;

    if (this.mostrarInsitop) {

      this.insitopLayer.addTo(this.map!);

    } else {

      this.map?.removeLayer(
        this.insitopLayer
      );

    }

  }
  // --- FULLSCREEN ROBUSTO Y COMPATIBLE ---
  private fullscreenTarget: HTMLElement | null = null;
  private isFullscreen = false;
  private fullscreenListener?: () => void;

  toggleFullscreen(): void {
    // Selecciona el panel principal del mapa
    const mapPanel = document.querySelector('.map-panel') as HTMLElement;
    if (!mapPanel) return;
    this.fullscreenTarget = mapPanel;

    // Detecta si ya está en fullscreen
    const isFs = this.getFullscreenElement() === mapPanel;
    if (!isFs) {
      // Solicita fullscreen con prefijos
      const req = mapPanel.requestFullscreen ||
        (mapPanel as any).webkitRequestFullscreen ||
        (mapPanel as any).msRequestFullscreen;
      if (req) req.call(mapPanel);
    } else {
      // Sale de fullscreen con prefijos
      const exit = document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).msExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  ngOnInit(): void {
    // Listener robusto para cambios de fullscreen
    this.fullscreenListener = () => this.onFullscreenChange();
    document.addEventListener('fullscreenchange', this.fullscreenListener);
    document.addEventListener('webkitfullscreenchange', this.fullscreenListener);
    document.addEventListener('msfullscreenchange', this.fullscreenListener);
  }

  ngOnDestroy(): void {
    if (this.fullscreenListener) {
      document.removeEventListener('fullscreenchange', this.fullscreenListener);
      document.removeEventListener('webkitfullscreenchange', this.fullscreenListener);
      document.removeEventListener('msfullscreenchange', this.fullscreenListener);
    }
  }

  private getFullscreenElement(): Element | null {
    return document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement || null;
  }

  private onFullscreenChange(): void {
    const isFs = this.getFullscreenElement() === this.fullscreenTarget;
    this.isFullscreen = isFs;
    // Ajusta el tamaño del mapa y aplica clase visual
    if (this.fullscreenTarget) {
      if (isFs) {
        this.fullscreenTarget.classList.add('fullscreen-active');
        setTimeout(() => {
          this.map?.invalidateSize();
        }, 350);
      } else {
        this.fullscreenTarget.classList.remove('fullscreen-active');
        setTimeout(() => {
          this.map?.invalidateSize();
        }, 350);
      }
    }
  }
  async descargarMapaComoImagen() {

    const element =
      document.querySelector(
        '.map-stage'
      ) as HTMLElement;

    const canvas =
      await html2canvas(element);

    const link =
      document.createElement('a');

    link.download =
      'mapa.png';

    link.href =
      canvas.toDataURL();

    link.click();

  }
  abrirFiltro(): void {
    this.mostrarFiltro = true;
  }

  cerrarFiltro(): void {
    this.mostrarFiltro = false;
  }
  crearGraficaExde(): void {

    if (!this.datosExde?.unidades) return;

    const labels = Object.keys(
      this.datosExde.unidades
    );

    const valores = labels.map(
      key => this.datosExde.unidades[key].total
    );

    this.barChartData = {
      labels,
      datasets: [
        {
          data: valores,
          label: 'Cantidad EXDE',
          backgroundColor: '#6899c4'
        }
      ]
    };

  }
  crearGraficaPelotones(): void {

    if (!this.datosPelotones?.unidades) return;

    const labels = Object.keys(
      this.datosPelotones.unidades
    );

    const operaciones = labels.map(
      key =>
        this.datosPelotones.unidades[key].operaciones
    );

    const entrenamiento = labels.map(
      key =>
        this.datosPelotones.unidades[key].entrenamiento
    );

    const descanso = labels.map(
      key =>
        this.datosPelotones.unidades[key].descanso
    );

    this.barChartPelotonesData = {

      labels,

      datasets: [

        {
          label: 'OPERACIONES',
          data: operaciones,
          backgroundColor: '#f3eced'
        },

        {
          label: 'ENTRENAMIENTO',
          data: entrenamiento,
          backgroundColor: '#b8a279'
        },

        {
          label: 'DESCANSO',
          data: descanso,
          backgroundColor: '#6899c4'
        }

      ]

    };

  }

  verDetalleUnidad(nombre: string): void {

    this.detalleSeleccionado =
      this.datosExde.unidades[nombre];

  }
  async descargarGrafica() {

    const element =
      document.querySelector(
        '.chart-container'
      ) as HTMLElement;

    const canvas =
      await html2canvas(element);

    const link =
      document.createElement('a');

    link.download =
      'grafica_exde.png';

    link.href =
      canvas.toDataURL();

    link.click();

  }
  irEventoMapa(item: any): void {

    if (!this.map) return;

    const lat =
      Number(item.hop_lat);

    const lon =
      Number(item.hop_lon);

    if (
      isNaN(lat) ||
      isNaN(lon)
    ) return;

    // CENTRAR MAPA

    this.map.setView(
      [lat, lon],
      15,
      {
        animate: true
      }
    );
    this.resaltarPunto(
      lat,
      lon,
      '#ff1744'
    );
    // POPUP

    const popup = L.popup({

      closeButton: true,

      autoClose: true

    })
      .setLatLng([lat, lon])
      .setContent(`

    <div style="
      min-width:220px;
      font-size:13px;
    ">

      <h3 style="
        margin:0;
        color:#7a0012;
      ">
        EVENTO
      </h3>

      <hr>

      <b>HR:</b>
      ${item.hr}<br>

      <b>UNIDAD:</b>
      ${item.unidad_operacional}<br>

      <b>ALERTA:</b>
      ${item.alerta}<br>

      <b>DISTANCIA:</b>
      ${Math.round(item.distancia_metros)} m<br>

      <b>ACCIÓN:</b>
      ${item.res_accion}<br>

      <b>COMANDANTE:</b>
      ${item.comandante}

    </div>

  `);

    popup.openOn(this.map);

  }
  toggleMinimizar(): void {

    this.minimizado =
      !this.minimizado;

  }
  panelActivo: HTMLElement | null = null;



  activarVentana(
    event: MouseEvent
  ): void {

    const panel =
      event.currentTarget as HTMLElement;

    panel.style.zIndex =
      String(Date.now());

  }
  iniciarDrag(
    event: MouseEvent
  ): void {

    if (!this.panelTabla) return;

    this.iniciarDragPanel(
      event,
      this.panelTabla.nativeElement
    );

  }
  iniciarResize(
    event: MouseEvent,
    direccion: string,
    panelRef: HTMLElement | ElementRef
  ): void {

    event.preventDefault();

    const panel =
      panelRef instanceof ElementRef
        ? panelRef.nativeElement
        : panelRef;

    const startX = event.clientX;
    const startY = event.clientY;

    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;

    const startTop = panel.offsetTop;
    const startLeft = panel.offsetLeft;

    const mover = (e: MouseEvent) => {

      // =========================
      // RIGHT
      // =========================

      if (
        direccion === 'right' ||
        direccion === 'bottom-right' ||
        direccion === 'top-right'
      ) {

        const width =
          startWidth +
          (e.clientX - startX);

        panel.style.width =
          `${Math.max(width, 320)}px`;

      }

      // =========================
      // BOTTOM
      // =========================

      if (
        direccion === 'bottom' ||
        direccion === 'bottom-right'
      ) {

        const height =
          startHeight +
          (e.clientY - startY);

        panel.style.height =
          `${Math.max(height, 220)}px`;

      }

      // =========================
      // TOP
      // =========================

      if (
        direccion === 'top' ||
        direccion === 'top-right'
      ) {

        const delta =
          e.clientY - startY;

        const height =
          startHeight - delta;

        const top =
          startTop + delta;

        if (height > 220) {

          panel.style.height =
            `${height}px`;

          panel.style.top =
            `${top}px`;

        }

      }

    };

    const detener = () => {

      document.removeEventListener(
        'mousemove',
        mover
      );

      document.removeEventListener(
        'mouseup',
        detener
      );

    };

    document.addEventListener(
      'mousemove',
      mover
    );

    document.addEventListener(
      'mouseup',
      detener
    );

  }

  onHeaderMouseDown(event: MouseEvent): void {

    const target = event.target as HTMLElement;

    // Evita drag si se hace click en botones
    if (
      target.closest('button') ||
      target.closest('.resize-handle')
    ) {
      return;
    }

    this.iniciarDrag(event);

  }
  cerrarPanelTabla(): void {

    //console.log('cerrando panel');

    this.mostrarTabla = false;

  }
  resaltarPunto(
    lat: number,
    lon: number,
    color: string = '#ffff00'
  ): void {

    if (!this.map) return;

    // =========================
    // LIMPIAR ANTERIOR
    // =========================

    if (this.markerSeleccionado) {

      this.map.removeLayer(
        this.markerSeleccionado
      );

    }

    if (this.circuloSeleccionado) {

      this.map.removeLayer(
        this.circuloSeleccionado
      );

    }

    // =========================
    // MARCADOR RESALTADO
    // =========================

    const marker =
      L.circleMarker(
        [lat, lon],
        {
          radius: 18,
          color: '#ffffff',
          weight: 5,
          fillColor: color,
          fillOpacity: 1
        }
      );

    // =========================
    // CIRCULO GLOW
    // =========================

    const glow =
      L.circle(
        [lat, lon],
        {
          radius: 250,
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2
        }
      );

    glow.addTo(this.map);

    marker.addTo(this.map);

    this.markerSeleccionado =
      marker;

    this.circuloSeleccionado =
      glow;

    // =========================
    // EFECTO PULSO
    // =========================

    let grow = true;

    const intervalo =
      setInterval(() => {

        if (!this.circuloSeleccionado) {

          clearInterval(intervalo);

          return;

        }

        const actual =
          this.circuloSeleccionado
            .getRadius();

        if (grow) {

          this.circuloSeleccionado
            .setRadius(actual + 40);

          if (actual > 500) {

            grow = false;

          }

        } else {

          this.circuloSeleccionado
            .setRadius(actual - 40);

          if (actual < 250) {

            grow = true;

          }

        }

      }, 60);

    // =========================
    // ELIMINAR DESPUÉS
    // =========================

    setTimeout(() => {

      clearInterval(intervalo);

      if (this.markerSeleccionado) {

        this.map?.removeLayer(
          this.markerSeleccionado
        );

        this.markerSeleccionado =
          null;

      }

      if (this.circuloSeleccionado) {

        this.map?.removeLayer(
          this.circuloSeleccionado
        );

        this.circuloSeleccionado =
          null;

      }

    }, 5000);

  }
  iniciarDragPanel(
    event: MouseEvent,
    panel: HTMLElement
  ): void {

    event.preventDefault();

    event.stopPropagation();

    this.panelActivo = panel;

    this.dragging = true;

    this.offsetX =
      event.clientX - panel.offsetLeft;

    this.offsetY =
      event.clientY - panel.offsetTop;

    const mover = (e: MouseEvent) => {

      if (!this.dragging) return;

      panel.style.left =
        `${e.clientX - this.offsetX}px`;

      panel.style.top =
        `${e.clientY - this.offsetY}px`;

    };

    const detener = () => {

      this.dragging = false;

      document.removeEventListener(
        'mousemove',
        mover
      );

      document.removeEventListener(
        'mouseup',
        detener
      );

    };

    document.addEventListener(
      'mousemove',
      mover
    );

    document.addEventListener(
      'mouseup',
      detener
    );

  }
  exportarEventosExcel(): void {

    const datos = this.informacion.map(
      item => ({

        hr: item.hr,

        unidad:
          item.unidad_operacional,

        alerta:
          item.alerta,

        distancia:
          item.distancia_metros,

        accion:
          item.res_accion,

        comandante:
          item.comandante

      })
    );

    const ws =
      XLSX.utils.json_to_sheet(datos);

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'EVENTOS'
    );

    XLSX.writeFile(
      wb,
      'eventos_operacionales.xlsx'
    );

  }
  informacionFiltrada(): any[] {

    if (!this.filtroTexto) {

      return this.informacion;

    }

    const texto =
      this.filtroTexto.toLowerCase();

    return this.informacion.filter(
      item =>

        item.unidad_operacional
          ?.toLowerCase()
          .includes(texto)

        ||

        item.alerta
          ?.toLowerCase()
          .includes(texto)

        ||

        item.res_accion
          ?.toLowerCase()
          .includes(texto)
    );

  }



  toggleEfectivos(): void {

    this.mostrarEfectivos =
      !this.mostrarEfectivos;

    if (this.mostrarEfectivos) {

      this.map?.addLayer(
        this.efectivosLayer
      );

    } else {

      this.map?.removeLayer(
        this.efectivosLayer
      );

    }

  }
  toggleCaboCdt(): void {

    this.mostrarCaboCdt =
      !this.mostrarCaboCdt;

    if (this.mostrarCaboCdt) {

      this.map?.addLayer(
        this.caboCdtLayer
      );

    } else {

      this.map?.removeLayer(
        this.caboCdtLayer
      );

    }

  }
  irCaboMapa(item: any): void {

    if (!this.map) return;

    const lat = Number(item[13]);
    const lon = Number(item[14]);

    if (
      isNaN(lat) ||
      isNaN(lon)
    ) return;
    this.resaltarPunto(
      lat,
      lon,
      '#00e5ff'
    );
    this.map.setView(
      [lat, lon],
      15,
      {
        animate: true
      }
    );

    L.popup()
      .setLatLng([lat, lon])
      .setContent(`

    <div>

      <h3>${item[2]}</h3>

      <b>COMANDANTE:</b>
      ${item[8]}<br>

      <b>ESTADO:</b>
      ${item[12]}<br>

      <b>MUNICIPIO:</b>
      ${item[5]}

    </div>

  `)
      .openOn(this.map);

  }
  irEfectivoMapa(item: any): void {

    if (!this.map) return;

    const lat = Number(item[8]);
    const lon = Number(item[9]);

    if (
      isNaN(lat) ||
      isNaN(lon)
    ) return;

    this.map.setView(
      [lat, lon],
      15,
      {
        animate: true
      }
    );
    this.resaltarPunto(
      lat,
      lon,
      '#ff9100'
    );
    L.popup()
      .setLatLng([lat, lon])
      .setContent(`

    <div>

      <h3>${item[2]}</h3>

      <b>COMANDANTE:</b>
      ${item[7]}<br>

      <b>EFECTIVOS:</b>
      ${item[10]}<br>

      <b>ESTADO:</b>
      ${item[13]}<br>

      <b>OBS:</b>
      ${item[14]}

    </div>

  `)
      .openOn(this.map);

  }
  // ========================================
  // EXPORTAR MAPA ACTIVO A KML
  // ========================================

  exportarMapaKML(): void {

    if (!this.map) return;

    try {

      let kml = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>`;

      // ========================================
      // HELPERS
      // ========================================

      const agregarPoint = (
        nombre: string,
        lat: number,
        lon: number,
        descripcion: string = ''
      ) => {

        kml += `
      <Placemark>

        <name>${nombre}</name>

        <description>
          <![CDATA[
            ${descripcion}
          ]]>
        </description>

        <Point>
          <coordinates>
            ${lon},${lat},0
          </coordinates>
        </Point>

      </Placemark>`;
      };

      const agregarLinea = (
        nombre: string,
        coords: string
      ) => {

        kml += `
      <Placemark>

        <name>${nombre}</name>

        <LineString>

          <tessellate>1</tessellate>

          <coordinates>
            ${coords}
          </coordinates>

        </LineString>

      </Placemark>`;
      };

      // ========================================
      // RECORRER CAPAS ACTIVAS
      // ========================================

      this.map.eachLayer((layer: any) => {

        // =========================
        // IGNORAR TILES
        // =========================

        if (
          layer instanceof L.TileLayer
        ) {
          return;
        }

        // =========================
        // MARCADORES
        // =========================

        if (
          layer instanceof L.Marker ||
          layer instanceof L.CircleMarker
        ) {

          const latlng =
            layer.getLatLng();

          const popupContent =
            layer.getPopup?.()
              ?.getContent?.();

          const popup =
            typeof popupContent === 'string'
              ? popupContent
              : '';

          agregarPoint(

            (layer.options as any)?.title ||
            'PUNTO',

            latlng.lat,

            latlng.lng,

            popup

          );

          agregarPoint(

            (layer.options as any)?.title ||
            'PUNTO',

            latlng.lat,

            latlng.lng,

            popup

          );

        }

        // =========================
        // LINEAS
        // =========================

        if (
          layer instanceof L.Polyline &&
          !(layer instanceof L.Polygon)
        ) {

          const latlngs =
            layer.getLatLngs();

          const coords =
            (latlngs as L.LatLng[])
              .map(ll =>
                `${ll.lng},${ll.lat},0`
              )
              .join(' ');

          agregarLinea(
            'LINEA',
            coords
          );

        }

      });

      kml += `
    </Document>
    </kml>`;

      // ========================================
      // DESCARGAR
      // ========================================

      const blob = new Blob(
        [kml],
        {
          type:
            'application/vnd.google-earth.kml+xml'
        }
      );

      const fecha =
        new Date()
          .toISOString()
          .replace(/[:.]/g, '-');

      saveAs(
        blob,
        `mapa_operacional_${fecha}.kml`
      );

    } catch (error) {

      console.error(error);

      alert(
        'Error exportando KML'
      );

    }

  }
  // ========================================
  // EXPORTAR TODO A EXCEL
  // ========================================


  exportarExcelMapaCompleto(): void {

    try {

      this.cargando = true;

      const wb = XLSX.utils.book_new();

      // =====================================
      // FUNCIÓN AUXILIAR
      // =====================================

      const agregarHoja = (
        nombre: string,
        datos: any[]
      ): void => {

        if (
          !datos ||
          !Array.isArray(datos) ||
          datos.length === 0
        ) {
          return;
        }

        const ws =
          XLSX.utils.json_to_sheet(datos);

        XLSX.utils.book_append_sheet(
          wb,
          ws,
          nombre
        );

      };

      // =====================================
      // EVENTOS
      // =====================================

      if (
        this.mostrarEventos &&
        this.informacion?.length
      ) {

        agregarHoja(

          'EVENTOS',

          this.informacion.map(
            (x: any) => ({

              hr: x.hr,
              unidad: x.unidad_operacional,
              alerta: x.alerta,
              accion: x.res_accion,
              comandante: x.comandante,
              distancia: x.distancia_metros,
              hop_lat: x.hop_lat,
              hop_lon: x.hop_lon

            })
          )

        );

      }

      // =====================================
      // INSITOP
      // =====================================

      if (
        this.mostrarInsitop &&
        this.informacionInsitop?.length
      ) {

        agregarHoja(

          'INSITOP',

          this.informacionInsitop.map(
            (x: any) => ({
              fecha: x.fecha_insitop,
              division: x.sigla_division,
              brigada: x.sigla_brigada,
              unidad: x.sigla_unidd,
              compania: x.compania,
              peloton: x.peloton,
              comandante: x.comandante,
              telefono: x.celular_comandante,
              departamento: x.departamento,
              municipio: x.municipio,
              lugar: x.lugar,
              detalle_lugar: x.detalle_lugar,
              oficiales: x.oficiales,
              suboficiales: x.suboficiales,
              slp: x.slp,
              sl18: x.sl18,
              sl2: x.sl2,
              soldados: x.total_soldados,
              exde: x.exde,
              ord_esc_bat: x.ord_esc_bat,
              code: x.code,
              operacion: x.operacion,
              linea_de_operaciones: x.linea_de_operaciones,
              tareas_accion_decisiva_ttf: x.tareas_accion_decisiva_ttf,
              tecnicas_actividades: x.tecnicas_actividades,
              tarea_especial: x.tarea_especial,
              tarea: x.tarea,
              relacion_de_mando: x.relacion_de_mando,
              coordenada_latitud: `${this.convertirCoordenadas(
                x.latitud,
                x.longitud
              )?.geografica?.latitud
                }`,
              coordenada_longitud: `${this.convertirCoordenadas(
                x.latitud,
                x.longitud
              )?.geografica?.longitud
                }`,
              latitud: x.latitud,
              longitud: x.longitud,
              coordenada_militares: `${this.convertirCoordenadas(
                x.latitud,
                x.longitud
              )?.militar?.mgrs
                }`,

              observaciones: x.observaciones


            })
          )

        );

      }

      // =====================================
      // CABO CDT
      // =====================================

      if (
        this.mostrarCaboCdt &&
        this.informacionCaboCdt?.length
      ) {

        agregarHoja(

          'CABO_CDT',

          this.informacionCaboCdt.map(
            (x: any) => ({

              division: x[0],
              brigada: x[1],
              unidad: x[2],
              arma: x[3],
              peloton: x[4],
              municipio: x[5],
              compania: x[7],
              comandante: x[8],
              celular: x[9],
              efectivos: x[10],
              estado: x[12],
              latitud: x[13],
              longitud: x[14]

            })
          )

        );

      }

      // =====================================
      // EFECTIVOS
      // =====================================

      if (
        this.mostrarEfectivos &&
        this.informacionEfectivos?.length
      ) {

        agregarHoja(

          'EFECTIVOS',

          this.informacionEfectivos.map(
            (x: any) => ({

              division: x[0],
              brigada: x[1],
              unidad: x[2],
              compania: x[3],
              peloton: x[4],
              municipio: x[5],
              comandante: x[7],
              efectivos: x[10],
              estado: x[13],
              observacion: x[14],
              latitud: x[8],
              longitud: x[9]

            })
          )

        );

      }

      // =====================================
      // AISLADAS
      // =====================================

      if (
        this.mostrarAisladas &&
        this.informacionAisladas?.length
      ) {

        agregarHoja(

          'AISLADAS',

          this.informacionAisladas.map(
            (x: any) => ({

              unidad: x[2],
              comandante: x[7],
              distancia: x[8],
              unidad_vecina: x[15],
              comandante_vecino: x[16],
              latitud: x[12],
              longitud: x[13]

            })
          )

        );

      }

      // =====================================
      // MOVIMIENTOS
      // =====================================

      if (
        this.mostrarMovimientos &&
        this.informacionMovimientos?.length
      ) {

        agregarHoja(

          'MOVIMIENTOS',

          this.informacionMovimientos.map(
            (x: any) => ({

              unidad: x.unidad,
              compania: x.compania,
              peloton: x.peloton,
              distancia: x.distancia_metros,

              fecha_actual:
                x.coordenada_actual?.fecha,

              lat_actual:
                x.coordenada_actual?.latitud,

              lon_actual:
                x.coordenada_actual?.longitud,

              fecha_anterior:
                x.coordenada_anterior?.fecha,

              lat_anterior:
                x.coordenada_anterior?.latitud,

              lon_anterior:
                x.coordenada_anterior?.longitud

            })
          )

        );

      }

      // =====================================
      // EXDE
      // =====================================

      if (
        this.mostrarExde &&
        this.datosExde?.unidades
      ) {

        agregarHoja(

          'EXDE',

          Object.keys(
            this.datosExde.unidades
          ).map(key => ({

            unidad: key,

            total:
              this.datosExde
                .unidades[key]
                .total

          }))

        );

      }

      // =====================================
      // PELOTONES
      // =====================================

      if (
        this.mostrarPelotones &&
        this.datosPelotones?.unidades
      ) {

        agregarHoja(

          'PELOTONES',

          Object.keys(
            this.datosPelotones.unidades
          ).map(key => ({

            unidad: key,

            operaciones:
              this.datosPelotones
                .unidades[key]
                .operaciones,

            entrenamiento:
              this.datosPelotones
                .unidades[key]
                .entrenamiento,

            descanso:
              this.datosPelotones
                .unidades[key]
                .descanso

          }))

        );

      }

      // =====================================
      // VALIDAR
      // =====================================

      if (wb.SheetNames.length === 0) {

        alert(
          'No hay datos para exportar'
        );

        this.cargando = false;

        return;

      }

      // =====================================
      // EXPORTAR
      // =====================================

      const fecha =
        new Date()
          .toISOString()
          .replace(/[:.]/g, '-');

      XLSX.writeFile(

        wb,

        `seguimiento_operacional_${fecha}.xlsx`

      );

      console.log(
        'Excel exportado correctamente'
      );

    } catch (error) {

      console.error(
        'ERROR EXPORTANDO:',
        error
      );

      alert(
        'Error exportando Excel'
      );

    } finally {

      this.cargando = false;

    }

  }
  async descargarGraficaPelotones() {

    const element =
      document.querySelector(
        '.chart-glass'
      ) as HTMLElement;

    if (!element) {

      alert(
        'No se encontró la gráfica'
      );

      return;

    }

    const canvas =
      await html2canvas(
        element,
        {
          backgroundColor: '#ffffff',
          scale: 2
        }
      );

    const link =
      document.createElement('a');

    link.download =
      'grafica_pelotones.png';

    link.href =
      canvas.toDataURL(
        'image/png'
      );

    link.click();

  }
  // seguimiento-operacional.ts (solo el cambio necesario)
  cargandoInformacion = false;

filtrarInformacion(): void {

  if (!this.fechaSeleccionada) {

    alert('Seleccione una fecha');

    return;

  }

  /* ====================================== */
  /* CERRAR MODAL */
  /* ====================================== */

  this.mostrarFiltro = false;

  /* ====================================== */
  /* ACTIVAR LOADERS */
  /* ====================================== */

  this.cargando = true;

  this.cargandoInformacion = true;

  /* ====================================== */
  /* FORM DATA */
  /* ====================================== */

  const formData = new FormData();

  formData.append(
    'fechaSeleccionada',
    this.fechaSeleccionada
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

  /* ====================================== */
  /* PETICIÓN */
  /* ====================================== */

  this.http.post(

    environment.mapaBase +
    environment.services.mapa.seguimiento_operacional,

    formData

  ).subscribe({

next: (respuesta: any) => {

  try {

    this.datosExde =
      respuesta.exde;

    this.datosPelotones =
      respuesta.pelotones;

    this.crearGraficaPelotones();

    this.crearGraficaExde();

    this.informacion =
      respuesta?.eventos || [];

    this.informacionInsitop =
      respuesta?.informacion_insitop || [];

    this.informacionCaboCdt =
      respuesta?.cabo_cdt || [];

    this.informacionEfectivos =
      respuesta?.efectivos_disminuidos || [];

    this.informacionAisladas =
      respuesta?.unidades_aisladas?.aisladas || [];

    this.movimientosData =
      respuesta?.movimientos || {};

    this.renderizarPuntos();

    this.renderizarInsitop();

    this.renderizarCaboCdt();

    this.renderizarEfectivos();

    this.renderizarAisladas();

    this.renderizarMovimientos();

  } finally {

    setTimeout(() => {

      this.cargando = false;

      this.cargandoInformacion = false;

      this.cd.detectChanges();

    }, 100);

  }

},
    error: (error) => {

      console.error(error);

      /* ====================================== */
      /* OCULTAR LOADERS */
      /* ====================================== */

      this.cargando = false;

      this.cargandoInformacion = false;

    }

  });

}
CalcularInformacion(): void {

  /* ====================================== */
  /* CERRAR MODAL */
  /* ====================================== */

  this.mostrarFiltro = false;

  /* ====================================== */
  /* ACTIVAR LOADERS */
  /* ====================================== */

  this.cargando = true;

  this.cargandoInformacion = true;

  /* ====================================== */
  /* FORM DATA */
  /* ====================================== */


  /* ====================================== */
  /* PETICIÓN */
  /* ====================================== */

  this.http.get(

    environment.mapaBase +
    environment.services.mapa.seguimiento_operacional_calcular,

    
  ).subscribe({

next: (respuesta: any) => {

  try {


  } finally {

    setTimeout(() => {

      this.cargando = false;

      this.cargandoInformacion = false;

      this.cd.detectChanges();

    }, 100);

  }

},
    error: (error) => {

      console.error(error);

      /* ====================================== */
      /* OCULTAR LOADERS */
      /* ====================================== */

      this.cargando = false;

      this.cargandoInformacion = false;

    }

  });

}

}