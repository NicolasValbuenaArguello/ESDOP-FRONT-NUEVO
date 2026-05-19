import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, TimeoutError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { AuthService, PermisoAcceso } from '../../services/auth';
import {
  AgrDivisionNodo,
  SubRegionRegistro,
  UnidadRegistroPlano,
  UnidadesTreeService
} from '../../services/unidades-tree.service';
import { AFECTACIONES_SUBMENUS, AfectacionesSubMenu } from './afectaciones-submenu';
import { Grado, UsuariosService } from '../usuarios/usuarios/usuarios.service';
import { AfectacionesService } from './afectaciones.service';
import {
  AfectacionListFilters,
  AfectacionListResponse,
  AfectacionRecord,
  AfectacionResponse
} from './afectaciones.models';

type CampoCarga = 'grados' | 'divisiones' | 'brigadas' | 'unidades' | 'municipios';
type AfectacionFeedbackType = 'success' | 'error' | 'warning';
type AfectacionFieldKey = keyof AfectacionRecord;

interface AfectacionFeedback {
  type: AfectacionFeedbackType;
  title: string;
  message: string;
  detail: string;
}

interface AfectacionDetailSection {
  key: string;
  title: string;
  description: string;
  fields: Array<{ key: AfectacionFieldKey; label: string }>;
}

@Component({
  selector: 'app-afectaciones',
  standalone: true,
  templateUrl: './afectaciones.html',
  styleUrls: ['./afectaciones.css'],
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AfectacionesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  permisoAfectaciones: PermisoAcceso | null = null;
  puedeVerAfectaciones = false;

  submenus = AFECTACIONES_SUBMENUS;
  submenuActivo: AfectacionesSubMenu = this.submenus[0];

  readonly generos = ['Masculino', 'Femenino', 'No binario', 'Prefiero no responder'];
  readonly clases = ['Oficial', 'Suboficial', 'Soldado', 'Civil'];
  readonly skeletonCards = Array.from({ length: 4 });
  readonly detalleSecciones: AfectacionDetailSection[] = [
    {
      key: 'evento',
      title: 'Evento',
      description: 'Datos basicos del hecho y de la ubicacion reportada.',
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'fecha_evento', label: 'Fecha del evento' },
        { key: 'hora_evento', label: 'Hora del evento' },
        { key: 'afectacion', label: 'Afectacion' },
        { key: 'lugar', label: 'Lugar' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'municipio', label: 'Municipio' },
        { key: 'hr', label: 'HR' },
        { key: 'cargado', label: 'Cargado a SICOE' }
      ]
    },
    {
      key: 'personal',
      title: 'Personal',
      description: 'Informacion de la persona asociada al registro.',
      fields: [
        { key: 'grado', label: 'Grado' },
        { key: 'clase', label: 'Clase' },
        { key: 'nombrey_apellidos', label: 'Nombre y apellidos' },
        { key: 'cedula', label: 'Cedula' },
        { key: 'edad', label: 'Edad' },
        { key: 'genero', label: 'Genero' }
      ]
    },
    {
      key: 'operacional',
      title: 'Operacional',
      description: 'Jerarquia, contexto tactico y caracterizacion operacional.',
      fields: [
        { key: 'division_padre', label: 'Division padre' },
        { key: 'division', label: 'Division' },
        { key: 'brigada', label: 'Brigada' },
        { key: 'unidad', label: 'Unidad' },
        { key: 'enemigo', label: 'Enemigo' },
        { key: 'estructura_afecta', label: 'Estructura afecta' },
        { key: 'tipo_operacion', label: 'Tipo de operacion' }
      ]
    },
    {
      key: 'descripcion',
      title: 'Descripcion',
      description: 'Narrativa del evento y observaciones complementarias.',
      fields: [
        { key: 'desccripcion_evento', label: 'Descripcion del evento' },
        { key: 'observaciones', label: 'Observaciones' }
      ]
    }
  ];

  grados: Grado[] = [];
  divisionPadres: string[] = [];
  todasLasDivisiones: string[] = [];
  divisiones: string[] = [];
  brigadas: string[] = [];
  unidades: string[] = [];
  departamentos: string[] = [];
  municipios: string[] = [];
  enemigos: string[] = [];
  tiposOperacion: string[] = [];
  loading = false;
  loadingListado = false;
  feedback: AfectacionFeedback | null = null;
  listFeedback: AfectacionFeedback | null = null;

  afectaciones: AfectacionRecord[] = [];
  totalAfectaciones = 0;
  detalleSeleccionado: AfectacionRecord | null = null;
  afectacionAEliminar: AfectacionRecord | null = null;
  modalDetalleAbierto = false;
  modalFiltrosAbierto = false;
  modalEliminarAbierto = false;
  registroEnProcesoId: number | null = null;
  edicionAfectacionId: number | null = null;
  filtrosAplicados: AfectacionListFilters = {};
  haConsultadoListado = false;

  erroresCarga = {
    grados: '',
    unidades: '',
    ubicacion: ''
  };

  loadingState: Record<CampoCarga, boolean> = {
    grados: false,
    divisiones: false,
    brigadas: false,
    unidades: false,
    municipios: false
  };

  readonly form;
  readonly filtersForm;

  private arbolUnidades: AgrDivisionNodo[] = [];
  private unidadesCatalogo: UnidadRegistroPlano[] = [];
  private subRegionesCatalogo: SubRegionRegistro[] = [];
  private loadSequence: Record<CampoCarga, number> = {
    grados: 0,
    divisiones: 0,
    brigadas: 0,
    unidades: 0,
    municipios: 0
  };

  constructor(
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    private readonly afectacionesService: AfectacionesService,
    private readonly unidadesTree: UnidadesTreeService,
    private readonly usuariosService: UsuariosService
  ) {
    this.form = this.fb.group({
      fecha_evento: ['', Validators.required],
      afectacion: ['', [Validators.required, Validators.maxLength(255)]],
      hora_evento: ['', Validators.required],
      lugar: ['', [Validators.required, Validators.maxLength(255)]],
      departamento: ['', Validators.required],
      municipio: ['', Validators.required],
      grado: ['', Validators.required],
      clase: ['', Validators.required],
      nombrey_apellidos: ['', [Validators.required, Validators.maxLength(255)]],
      cedula: ['', [Validators.required, Validators.maxLength(20)]],
      edad: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
      genero: ['', Validators.required],
      division_padre: ['', Validators.required],
      division: ['', Validators.required],
      brigada: ['', Validators.required],
      unidad: ['', Validators.required],
      enemigo: ['', [Validators.required, Validators.maxLength(255)]],
      estructura_afecta: ['', Validators.required],
      tipo_operacion: ['', Validators.required],
      desccripcion_evento: ['', Validators.required],
      observaciones: [''],
      cargado: [false],
      hr: ['']
    });

    this.filtersForm = this.fb.nonNullable.group({
      fecha_inicial: ['', Validators.required],
      fecha_final: ['', Validators.required],
      division: ['']
    });
  }

  ngOnInit() {
    this.permisoAfectaciones = this.auth.obtenerPermisoRuta('/afectaciones');
    this.puedeVerAfectaciones = !!this.permisoAfectaciones?.puede_ver;

    this.cargarCatalogosLocales();
    this.cargarGrados();
    this.configurarSelectsDependientes();

  }

  seleccionarSubmenu(sub: AfectacionesSubMenu) {
    this.submenuActivo = sub;
    this.cdr.markForCheck();
  }

  get divisionPadreSeleccionada() {
    return this.form.controls.division_padre.value || '';
  }

  get divisionSeleccionada() {
    return this.form.controls.division.value || '';
  }

  get brigadaSeleccionada() {
    return this.form.controls.brigada.value || '';
  }

  get formularioInvalido() {
    return this.form.invalid || this.loadingState.grados || this.loading;
  }

  get cargadoSicoe() {
    return !!this.form.controls.cargado.value;
  }

  get estaEnModoEdicion() {
    return this.edicionAfectacionId !== null;
  }

  get hayFiltrosActivos() {
    return Object.values(this.filtrosAplicados).some((value) => !!value);
  }

  get puedeConsultarListado() {
    return !!this.filtrosAplicados.fecha_inicial && !!this.filtrosAplicados.fecha_final;
  }

  get filtrosAplicadosLista() {
    return [
      this.filtrosAplicados.fecha_inicial ? `Desde ${this.filtrosAplicados.fecha_inicial}` : '',
      this.filtrosAplicados.fecha_final ? `Hasta ${this.filtrosAplicados.fecha_final}` : '',
      this.filtrosAplicados.division ? `Division ${this.filtrosAplicados.division}` : ''
    ].filter(Boolean);
  }

  filterFieldInvalid(controlName: keyof typeof this.filtersForm.controls) {
    const control = this.filtersForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  fieldInvalid(controlName: keyof typeof this.form.controls) {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(controlName: keyof typeof this.form.controls) {
    const control = this.form.controls[controlName];

    if (!control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['maxlength']) {
      return 'El valor supera la longitud permitida.';
    }

    if (control.errors['min']) {
      return 'El valor debe ser mayor o igual a 0.';
    }

    if (control.errors['max']) {
      return 'El valor supera el limite permitido.';
    }

    return 'Revisa este campo.';
  }

  submit() {
    if (this.loading) {
      return;
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.feedback = null;

    const request = this.estaEnModoEdicion && this.edicionAfectacionId !== null
      ? this.afectacionesService.actualizarAfectacion(this.edicionAfectacionId, this.construirFormData())
      : this.afectacionesService.crearAfectacion(this.construirFormData());

    request
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => this.procesarRespuesta(response, this.estaEnModoEdicion ? 'update' : 'create'),
        error: (error) => {
          this.feedback = this.mapearErrorAccion(
            error,
            this.estaEnModoEdicion ? 'actualizar la afectacion' : 'guardar la afectacion'
          );
        }
      });

    this.cdr.markForCheck();
  }

  abrirDetalle(registro: AfectacionRecord) {
    this.detalleSeleccionado = registro;
    this.modalDetalleAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarDetalle() {
    this.modalDetalleAbierto = false;
    this.detalleSeleccionado = null;
    this.cdr.markForCheck();
  }

  abrirFiltros() {
    this.filtersForm.patchValue(
      {
        fecha_inicial: this.filtrosAplicados.fecha_inicial || '',
        fecha_final: this.filtrosAplicados.fecha_final || '',
        division: this.filtrosAplicados.division || ''
      },
      { emitEvent: false }
    );
    this.modalFiltrosAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarFiltros() {
    this.modalFiltrosAbierto = false;
    this.cdr.markForCheck();
  }

  aplicarFiltros() {
    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const raw = this.filtersForm.getRawValue();
    this.filtrosAplicados = {
      fecha_inicial: raw.fecha_inicial || undefined,
      fecha_final: raw.fecha_final || undefined,
      division: raw.division || undefined
    };
    this.modalFiltrosAbierto = false;
    this.listFeedback = {
      type: 'success',
      title: 'Filtros listos',
      message: 'El rango de fechas quedo preparado para la consulta.',
      detail: 'Pulsa "Recargar" para ejecutar el listado con estos filtros.'
    };
    this.cdr.markForCheck();
  }

  limpiarFiltros() {
    this.filtersForm.reset(
      {
        fecha_inicial: '',
        fecha_final: '',
        division: ''
      },
      { emitEvent: false }
    );
    this.filtrosAplicados = {};
    this.modalFiltrosAbierto = false;
    this.afectaciones = [];
    this.totalAfectaciones = 0;
    this.haConsultadoListado = false;
    this.listFeedback = {
      type: 'warning',
      title: 'Filtros limpiados',
      message: 'Debes volver a definir el rango de fechas antes de consultar.',
      detail: 'Abre filtros, selecciona fecha inicial y fecha final, y luego pulsa "Recargar".'
    };
    this.cdr.markForCheck();
  }

  recargarListado() {
    if (!this.puedeConsultarListado) {
      this.listFeedback = {
        type: 'warning',
        title: 'Fechas obligatorias',
        message: 'La consulta del listado requiere fecha inicial y fecha final.',
        detail: 'Configura ambos campos en "Filtros" y luego usa "Recargar".'
      };
      this.cdr.markForCheck();
      return;
    }

    this.haConsultadoListado = true;
    this.cargarAfectaciones();
  }

  editarAfectacion(registro: AfectacionRecord) {
    this.edicionAfectacionId = registro.id;
    this.feedback = null;
    this.listFeedback = null;
    this.cargarRegistroEnFormulario(registro);
    this.submenuActivo = this.submenus.find((sub) => sub.key === 'creacion') || this.submenus[0];
    this.cdr.markForCheck();
  }

  cancelarEdicion() {
    this.edicionAfectacionId = null;
    this.feedback = null;
    this.resetFormulario(false);
  }

  confirmarEliminar(registro: AfectacionRecord) {
    this.afectacionAEliminar = registro;
    this.modalEliminarAbierto = true;
    this.cdr.markForCheck();
  }

  cancelarEliminar() {
    this.modalEliminarAbierto = false;
    this.afectacionAEliminar = null;
    this.cdr.markForCheck();
  }

  eliminarAfectacionConfirmada() {
    if (!this.afectacionAEliminar) {
      return;
    }

    const registro = this.afectacionAEliminar;
    this.registroEnProcesoId = registro.id;

    this.afectacionesService.eliminarAfectacion(registro.id)
      .pipe(
        finalize(() => {
          this.registroEnProcesoId = null;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.modalEliminarAbierto = false;
          this.afectacionAEliminar = null;
          this.listFeedback = {
            type: response.success ? 'success' : 'warning',
            title: response.success ? 'Registro eliminado' : 'Eliminacion pendiente',
            message: response.message || (
              response.success
                ? 'La afectacion fue eliminada correctamente.'
                : 'No fue posible completar la eliminacion.'
            ),
            detail: response.success
              ? 'El listado se actualizo automaticamente para reflejar el cambio.'
              : 'Revisa la disponibilidad del servicio e intenta nuevamente.'
          };
          this.refrescarListadoSiCorresponde(false);
        },
        error: (error) => {
          this.modalEliminarAbierto = false;
          this.afectacionAEliminar = null;
          this.listFeedback = this.mapearErrorAccion(error, 'eliminar la afectacion');
        }
      });

    this.cdr.markForCheck();
  }

  cerrarFeedback() {
    this.feedback = null;
    this.cdr.markForCheck();
  }

  cerrarListFeedback() {
    this.listFeedback = null;
    this.cdr.markForCheck();
  }

  trackByAfectacionId(_: number, item: AfectacionRecord) {
    return item.id;
  }

  getDetalleValor(registro: AfectacionRecord, campo: AfectacionFieldKey) {
    const value = registro[campo];

    if (campo === 'fecha_evento' && typeof value === 'string') {
      return this.formatearFecha(value);
    }

    if (campo === 'hora_evento' && typeof value === 'string') {
      return value.slice(0, 5) || 'Sin dato';
    }

    if (campo === 'cargado') {
      return value ? 'Si' : 'No';
    }

    if (value === null || value === undefined || value === '') {
      return 'Sin dato';
    }

    return String(value);
  }

  formatearFecha(fecha: string) {
    if (!fecha || !fecha.includes('-')) {
      return fecha || 'Sin fecha';
    }

    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  cargarAfectaciones(showLoader = true) {
    if (showLoader) {
      this.loadingListado = true;
    }

    this.listFeedback = null;

    this.afectacionesService.listarAfectaciones(this.filtrosAplicados)
      .pipe(
        finalize(() => {
          this.loadingListado = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => this.procesarListado(response),
        error: (error) => {
          this.afectaciones = [];
          this.totalAfectaciones = 0;
          this.listFeedback = this.mapearErrorAccion(error, 'cargar el listado de afectaciones');
        }
      });

    this.cdr.markForCheck();
  }

  private refrescarListadoSiCorresponde(showLoader = false) {
    if (!this.haConsultadoListado || !this.puedeConsultarListado) {
      return;
    }

    this.cargarAfectaciones(showLoader);
  }

  private procesarListado(response: AfectacionListResponse) {
    if (!response.success) {
      this.afectaciones = [];
      this.totalAfectaciones = 0;
      this.listFeedback = {
        type: 'warning',
        title: 'No fue posible obtener el listado',
        message: response.message || 'El backend devolvio una respuesta sin resultados validos.',
        detail: 'Puedes intentar nuevamente o ajustar los filtros aplicados.'
      };
      return;
    }

    this.afectaciones = response.data || [];
    this.totalAfectaciones = response.total ?? this.afectaciones.length;
  }

  private construirFormData(): FormData {
    const formData = new FormData();

    Object.entries(this.form.getRawValue()).forEach(([key, value]) => {
      const normalizedValue = typeof value === 'boolean'
        ? String(value)
        : value === null || value === undefined
          ? ''
          : String(value);

      formData.append(key, normalizedValue);
    });

    return formData;
  }

  private configurarSelectsDependientes() {
    this.form.controls.division_padre.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((divisionPadre) => {
        this.resetJerarquiaDesde('division');
        this.cargarDivisiones(divisionPadre || '');
      });

    this.form.controls.division.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((division) => {
        this.resetJerarquiaDesde('brigada');
        this.cargarBrigadas(this.divisionPadreSeleccionada, division || '');
      });

    this.form.controls.brigada.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((brigada) => {
        this.form.controls.unidad.setValue('', { emitEvent: false });
        this.cargarUnidades(this.divisionPadreSeleccionada, this.divisionSeleccionada, brigada || '');
      });

    this.form.controls.departamento.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((departamento) => {
        this.form.controls.municipio.setValue('', { emitEvent: false });
        this.cargarMunicipios(departamento || '');
      });
  }

  private cargarCatalogosLocales() {
    this.unidadesCatalogo = this.unidadesTree.normalizarRegistros(
      this.auth.obtenerUnidadesUsuario().length
        ? this.auth.obtenerUnidadesUsuario()
        : this.leerStorage('unidades')
    );

    this.subRegionesCatalogo = this.auth.obtenerSubRegionesUsuario().length
      ? this.auth.obtenerSubRegionesUsuario()
      : this.unidadesTree.normalizarSubRegiones(this.leerStorage('sub_regiones'));

    this.arbolUnidades = this.unidadesTree.construirJerarquia(this.unidadesCatalogo);
    this.divisionPadres = this.arbolUnidades.map((item) => item.agr_div).sort((a, b) => a.localeCompare(b));
    this.todasLasDivisiones = Array.from(
      new Set(
        this.arbolUnidades.flatMap((item) => item.divisiones.map((division) => division.division))
      )
    ).sort((a, b) => a.localeCompare(b));
    this.departamentos = this.obtenerDepartamentos();
    this.enemigos = this.unidadesTree.obtenerNombresEnemigoDesdeStorage();
    this.tiposOperacion = this.unidadesTree.obtenerNombresTipoOperacionDesdeStorage();

    this.erroresCarga.unidades = this.divisionPadres.length
      ? ''
      : 'No hay estructura organizacional disponible para este usuario.';
    this.erroresCarga.ubicacion = this.departamentos.length
      ? ''
      : 'No hay ubicaciones disponibles para este usuario.';

    this.cdr.markForCheck();
  }

  private cargarGrados() {
    this.loadingState.grados = true;
    this.erroresCarga.grados = '';

    this.usuariosService.getGrados()
      .pipe(
        finalize(() => {
          this.loadingState.grados = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (grados) => {
          this.grados = [...grados].sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre));
        },
        error: () => {
          this.grados = [];
          this.erroresCarga.grados = 'No fue posible cargar los grados.';
        }
      });
  }

  private cargarDivisiones(divisionPadre: string) {
    const sequence = ++this.loadSequence.divisiones;
    this.loadingState.divisiones = true;
    this.divisiones = [];

    setTimeout(() => {
      if (sequence !== this.loadSequence.divisiones) {
        return;
      }

      this.divisiones = this.obtenerDivisionesPorPadre(divisionPadre);
      this.loadingState.divisiones = false;
      this.cdr.markForCheck();
    }, 120);
  }

  private cargarBrigadas(divisionPadre: string, division: string) {
    const sequence = ++this.loadSequence.brigadas;
    this.loadingState.brigadas = true;
    this.brigadas = [];

    setTimeout(() => {
      if (sequence !== this.loadSequence.brigadas) {
        return;
      }

      this.brigadas = this.obtenerBrigadasPorDivision(divisionPadre, division);
      this.loadingState.brigadas = false;
      this.cdr.markForCheck();
    }, 120);
  }

  private cargarUnidades(divisionPadre: string, division: string, brigada: string) {
    const sequence = ++this.loadSequence.unidades;
    this.loadingState.unidades = true;
    this.unidades = [];

    setTimeout(() => {
      if (sequence !== this.loadSequence.unidades) {
        return;
      }

      this.unidades = this.obtenerUnidadesPorBrigada(divisionPadre, division, brigada);
      this.loadingState.unidades = false;
      this.cdr.markForCheck();
    }, 120);
  }

  private cargarMunicipios(departamento: string) {
    const sequence = ++this.loadSequence.municipios;
    this.loadingState.municipios = true;
    this.municipios = [];

    setTimeout(() => {
      if (sequence !== this.loadSequence.municipios) {
        return;
      }

      if (!departamento) {
        this.loadingState.municipios = false;
        this.cdr.markForCheck();
        return;
      }

      this.municipios = this.obtenerMunicipiosPorDepartamento(departamento);
      this.loadingState.municipios = false;
      this.cdr.markForCheck();
    }, 120);
  }

  private obtenerDepartamentos() {
    const departamentosSubRegiones = this.unidadesTree.obtenerDepartamentosPorSubRegiones(this.subRegionesCatalogo, []);
    const departamentosUnidades = this.unidadesCatalogo.map((item) => item.dpto).filter(Boolean);

    return Array.from(new Set([...departamentosSubRegiones, ...departamentosUnidades]))
      .sort((a, b) => a.localeCompare(b));
  }

  private obtenerDivisionesPorPadre(divisionPadre: string) {
    const agrupador = this.arbolUnidades.find((item) => item.agr_div === divisionPadre);
    return agrupador
      ? agrupador.divisiones.map((item) => item.division).sort((a, b) => a.localeCompare(b))
      : [];
  }

  private obtenerBrigadasPorDivision(divisionPadre: string, division: string) {
    const divisionNodo = this.arbolUnidades
      .find((item) => item.agr_div === divisionPadre)
      ?.divisiones.find((item) => item.division === division);

    return divisionNodo
      ? divisionNodo.brigadas.map((item) => item.brigada).sort((a, b) => a.localeCompare(b))
      : [];
  }

  private obtenerUnidadesPorBrigada(divisionPadre: string, division: string, brigada: string) {
    const brigadaNodo = this.arbolUnidades
      .find((item) => item.agr_div === divisionPadre)
      ?.divisiones.find((item) => item.division === division)
      ?.brigadas.find((item) => item.brigada === brigada);

    return brigadaNodo
      ? brigadaNodo.unidades.map((item) => item.unidad).sort((a, b) => a.localeCompare(b))
      : [];
  }

  private obtenerMunicipiosPorDepartamento(departamento: string) {
    const municipiosSubRegiones = this.unidadesTree.obtenerMunicipiosPorSubRegionesYDepartamentos(
      this.subRegionesCatalogo,
      [],
      [departamento]
    );

    const municipiosUnidades = this.unidadesCatalogo
      .filter((item) => item.dpto === departamento)
      .map((item) => item.mpio)
      .filter(Boolean);

    return Array.from(new Set([...municipiosSubRegiones, ...municipiosUnidades]))
      .sort((a, b) => a.localeCompare(b));
  }

  private procesarRespuesta(response: AfectacionResponse, mode: 'create' | 'update') {
    if (response.success) {
      this.feedback = {
        type: 'success',
        title: mode === 'update' ? 'Afectacion actualizada' : 'Afectacion cargada',
        message: response.message || (
          mode === 'update'
            ? 'La afectacion se actualizo correctamente.'
            : 'La afectacion se registro correctamente.'
        ),
        detail: mode === 'update'
          ? 'Los cambios ya quedaron listos y el listado se refrescara automaticamente.'
          : 'El formulario se limpio automaticamente y ya puedes registrar una nueva afectacion.'
      };

      this.refrescarListadoSiCorresponde(false);

      if (mode === 'update') {
        this.edicionAfectacionId = null;
        this.submenuActivo = this.submenus.find((sub) => sub.key === 'listado') || this.submenus[0];
      }

      this.resetFormulario(false);
      return;
    }

    this.feedback = {
      type: 'warning',
      title: 'Revision requerida',
      message: response.message || 'La afectacion no pudo ser procesada.',
      detail: 'Revisa la informacion e intenta nuevamente. Los datos siguen visibles para evitar perdida de informacion.'
    };
  }

  private mapearErrorAccion(error: unknown, accion: string): AfectacionFeedback {
    if (error instanceof TimeoutError) {
      return {
        type: 'error',
        title: 'Tiempo de espera agotado',
        message: `El servicio tardo demasiado en responder al intentar ${accion}.`,
        detail: 'Verifica la conexion o intenta nuevamente en unos minutos.'
      };
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return {
          type: 'error',
          title: 'Sin conexion con el servicio',
          message: `No fue posible comunicarse con el backend al intentar ${accion}.`,
          detail: 'El microservicio podria estar caido, inaccesible o bloqueado por la red.'
        };
      }

      if (error.status >= 500) {
        return {
          type: 'error',
          title: 'Error interno del servidor',
          message: error.error?.message || `El backend devolvio un error al intentar ${accion}.`,
          detail: `Codigo HTTP ${error.status}. Intenta nuevamente cuando el servicio este disponible.`
        };
      }

      return {
        type: 'error',
        title: 'Solicitud no completada',
        message: error.error?.message || error.message || `No fue posible ${accion}.`,
        detail: `Codigo HTTP ${error.status || 'desconocido'}. Revisa la informacion enviada y vuelve a intentarlo.`
      };
    }

    return {
      type: 'error',
      title: 'Error inesperado',
      message: `Ocurrio un problema al intentar ${accion}.`,
      detail: 'Intenta nuevamente. Si el problema persiste, revisa la disponibilidad del microservicio.'
    };
  }

  private cargarRegistroEnFormulario(registro: AfectacionRecord) {
    this.divisiones = this.obtenerDivisionesPorPadre(registro.division_padre);
    this.brigadas = this.obtenerBrigadasPorDivision(registro.division_padre, registro.division);
    this.unidades = this.obtenerUnidadesPorBrigada(registro.division_padre, registro.division, registro.brigada);
    this.municipios = this.obtenerMunicipiosPorDepartamento(registro.departamento);

    this.form.reset(
      {
        fecha_evento: registro.fecha_evento || '',
        afectacion: registro.afectacion || '',
        hora_evento: registro.hora_evento ? registro.hora_evento.slice(0, 5) : '',
        lugar: registro.lugar || '',
        departamento: registro.departamento || '',
        municipio: registro.municipio || '',
        grado: registro.grado || '',
        clase: registro.clase || '',
        nombrey_apellidos: registro.nombrey_apellidos || '',
        cedula: registro.cedula || '',
        edad: typeof registro.edad === 'number' ? registro.edad : null,
        genero: registro.genero || '',
        division_padre: registro.division_padre || '',
        division: registro.division || '',
        brigada: registro.brigada || '',
        unidad: registro.unidad || '',
        enemigo: registro.enemigo || '',
        estructura_afecta: registro.estructura_afecta || '',
        tipo_operacion: registro.tipo_operacion || '',
        desccripcion_evento: registro.desccripcion_evento || '',
        observaciones: registro.observaciones || '',
        cargado: !!registro.cargado,
        hr: registro.hr || ''
      },
      { emitEvent: false }
    );

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private resetFormulario(clearEdition = true) {
    this.form.reset(
      {
        fecha_evento: '',
        afectacion: '',
        hora_evento: '',
        lugar: '',
        departamento: '',
        municipio: '',
        grado: '',
        clase: '',
        nombrey_apellidos: '',
        cedula: '',
        edad: null,
        genero: '',
        division_padre: '',
        division: '',
        brigada: '',
        unidad: '',
        enemigo: '',
        estructura_afecta: '',
        tipo_operacion: '',
        desccripcion_evento: '',
        observaciones: '',
        cargado: false,
        hr: ''
      },
      { emitEvent: false }
    );

    if (clearEdition) {
      this.edicionAfectacionId = null;
    }

    this.divisiones = [];
    this.brigadas = [];
    this.unidades = [];
    this.municipios = [];

    Object.values(this.form.controls).forEach((control) => {
      control.setErrors(null);
      control.markAsPristine();
      control.markAsUntouched();
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.cdr.markForCheck();
  }

  private resetJerarquiaDesde(nivel: 'division' | 'brigada') {
    if (nivel === 'division') {
      this.form.controls.division.setValue('', { emitEvent: false });
      this.divisiones = [];
    }

    this.form.controls.brigada.setValue('', { emitEvent: false });
    this.form.controls.unidad.setValue('', { emitEvent: false });
    this.brigadas = [];
    this.unidades = [];
  }

  private leerStorage(key: string): unknown[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
