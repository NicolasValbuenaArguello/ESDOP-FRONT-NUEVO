import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SeguimientoSubmenu } from '../interfaces/seguimiento-operacional.interface';

/**
 * Servicio centralizado para la gestión de peticiones relacionadas con el seguimiento operacional.
 *
 * - Utiliza FormData para enviar filtros y parámetros al backend (no JSON directo).
 * - La URL del endpoint se obtiene dinámicamente desde environment (no hardcode).
 * - Centraliza la lógica HTTP y el manejo de estados (loading, error).
 * - Preparado para futuras ampliaciones: WebSockets, tiempo real, polling, filtros avanzados, paginación, cache, etc.
 * - Documentado para fácil mantenimiento y ampliación.
 *
 * Flujo de datos:
 *   1. El componente construye un objeto de filtros y llama a consultarOperacion().
 *   2. El servicio transforma los filtros en FormData y realiza la petición POST.
 *   3. El backend responde y el observable emite la data para alimentar los módulos dinámicos.
 *   4. Estados loading y error se exponen como observables para integración visual.
 *
 * Ejemplo de uso:
 *   this.seguimientoService.consultarOperacion({ fecha_inicio, fecha_fin, modulo })
 *     .subscribe(resp => { ... });
 */
@Injectable({
  providedIn: 'root',
})
export class SeguimientoOperacionalService {
    /**
     * Filtros iniciales por defecto para el módulo operacional.
     */
    readonly filtrosIniciales: import('../interfaces/seguimiento-operacional.interface').SeguimientoFiltroState = {
      lapso: '24h',
      prioridad: 'todas',
      estado: 'todos',
      unidad: ''
    };

    /**
     * Retorna el menú operacional principal usando los métodos privados existentes.
     */
    obtenerMenuOperacional(): import('../interfaces/seguimiento-operacional.interface').SeguimientoMenu[] {
      return [
        {
          nombre: 'Operacional',
          icono: 'bi-broadcast-pin',
          abierto: true,
          submenus: [
            this.crearAlertasCriticas(),
            this.crearEventosExde(),
            this.crearMovimientoEnCero(),
            this.crearUnidadesReducidas()
          ]
        }
      ];
    }

    /**
     * Aplica filtros a una sección operacional, filtrando alertas según prioridad, estado y unidad.
     * Retorna una nueva sección filtrada.
     */
    aplicarFiltrosASeccion(
      seccion: import('../interfaces/seguimiento-operacional.interface').SeguimientoSubmenu,
      filtros: import('../interfaces/seguimiento-operacional.interface').SeguimientoFiltroState
    ): import('../interfaces/seguimiento-operacional.interface').SeguimientoSubmenu {
      const filtradas = seccion.alertas.filter(alerta => {
        const matchPrioridad = filtros.prioridad === 'todas' || alerta.severidad === filtros.prioridad;
        const matchEstado = filtros.estado === 'todos' || alerta.estado === filtros.estado;
        const matchUnidad = !filtros.unidad || alerta.unidad === filtros.unidad;
        return matchPrioridad && matchEstado && matchUnidad;
      });
      return {
        ...seccion,
        alertas: filtradas
      };
    }
  /**
   * URL base para el endpoint de seguimiento operacional, obtenida dinámicamente desde environment.
   */
  // private readonly apiUrl: string = environment.services.mapa.seguimiento_operacional;
  private apiUrl = `${environment.mapaBase}${environment.services?.mapa?.seguimiento_operacional ?? '/seguimiento_operacional'}`;
  
  /**
   * Estado de carga para operaciones HTTP.
   */
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  /**
   * Último error recibido del backend.
   */
  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Realiza una consulta operacional al backend usando FormData.
   *
   * @param filtros Objeto plano con los filtros y parámetros a enviar (clave: valor).
   *   Ejemplo: { fecha_inicio: '2024-01-01', fecha_fin: '2024-01-31', modulo: 'resumen' }
   * @returns Observable<any> con la respuesta del backend (puede ser tipado en el futuro).
   *
   * Detalles:
   * - Convierte el objeto de filtros a FormData (no JSON).
   * - Envía la petición POST a la URL definida en environment.services.mapa.seguimiento_operacional.
   * - Maneja loading y error de forma reactiva.
   * - Listo para ampliaciones: headers, autenticación, etc.
   *
   * Documentación:
   * - https://developer.mozilla.org/en-US/docs/Web/API/FormData
   * - https://angular.io/guide/http
   */
consultarOperacion(formData: FormData): Observable<any> {

  this.loadingSubject.next(true);
  this.errorSubject.next(null);

  return this.http.post<any>(
    this.apiUrl,
    formData
  ).pipe(

    tap(() => {

    }),

    catchError((error: HttpErrorResponse) => {

      let msg = 'Error desconocido';

      if (error.error instanceof ErrorEvent) {

        msg = `Error de red: ${error.error.message}`;

      } else if (error.status) {

        msg = `Error ${error.status}: ${error.statusText || error.message}`;
      }

      this.errorSubject.next(msg);

      return throwError(() => new Error(msg));

    }),

    finalize(() => {

      this.loadingSubject.next(false);

    })
  );
}

  /**
   * Permite limpiar el estado de error manualmente.
   * Útil para resetear el estado visual desde el componente.
   */


  private crearAlertasCriticas(): SeguimientoSubmenu {
    return {
      id: 'alertas-criticas',
      nombre: 'Alertas Criticas',
      descripcion: 'Seguimiento de eventos de alto impacto con trazabilidad, escalamiento y tiempos de respuesta.',
      icono: 'bi-radioactive',
      estado: 'Escalamiento tactico',
      etiqueta: 'Alta prioridad',
      resumen: 'Seccion disenada para priorizar incidentes, coordinar responsables y registrar decisiones operacionales.',
      metricas: [
        { label: 'SLA objetivo', valor: '< 5 min', tendencia: 'Notificacion inmediata' },
        { label: 'Escalones', valor: '03', tendencia: 'Unidad, comando, soporte' },
        { label: 'Bitacoras', valor: '100%', tendencia: 'Auditoria habilitable' }
      ],
      cards: [
        {
          id: 'ac-1',
          titulo: 'Casos criticos',
          valor: '05',
          descripcion: 'Eventos en ventana roja con escalamiento en curso.',
          icono: 'bi-radioactive',
          tono: 'critico'
        },
        {
          id: 'ac-2',
          titulo: 'Tiempo medio',
          valor: '03:42',
          descripcion: 'Promedio de primer contacto y validacion para incidentes mayores.',
          icono: 'bi-bar-chart-line',
          tono: 'alerta'
        },
        {
          id: 'ac-3',
          titulo: 'Coordinaciones',
          valor: '11',
          descripcion: 'Interacciones registradas entre comando, analitica y respuesta.',
          icono: 'bi-diagram-3',
          tono: 'info'
        }
      ],
      capacidades: [
        'Preparado para permisos por usuario y nivel de acceso',
        'Compatible con dashboards de respuesta y tiempos',
        'Listo para integracion con servicios FastAPI'
      ],
      alertas: [
        {
          id: 'ac-a1',
          titulo: 'Escalamiento en corredor suroriental',
          detalle: 'Concentracion de indicios EXDE y alteracion de movilidad sobre eje secundario.',
          tiempo: 'Hace 5 min',
          severidad: 'alta',
          estado: 'activo',
          unidad: 'BRCMI'
        },
        {
          id: 'ac-a2',
          titulo: 'Reevaluacion de capacidad de respuesta',
          detalle: 'Se redistribuyen responsables y se incrementa vigilancia en zona priorizada.',
          tiempo: 'Hace 16 min',
          severidad: 'alta',
          estado: 'monitoreo',
          unidad: 'DIV02'
        }
      ],
      tabla: [
        {
          id: 'ac-t1',
          unidad: 'BRCMI',
          sector: 'Eje suroriental',
          estado: 'activo',
          prioridad: 'alta',
          actualizacion: '20:09',
          detalle: 'Evento EXDE con confirmacion de mando'
        },
        {
          id: 'ac-t2',
          unidad: 'DIV02',
          sector: 'Zona urbana ampliada',
          estado: 'monitoreo',
          prioridad: 'alta',
          actualizacion: '19:58',
          detalle: 'Ajuste de cobertura y seguimiento de capacidades'
        }
      ],
      marcadores: [
        {
          id: 'ac-m1',
          titulo: 'BRCMI',
          detalle: 'Evento critico en validacion de impacto.',
          unidad: 'BRCMI',
          prioridad: 'alta',
          estado: 'activo',
          latitud: 1.2136,
          longitud: -77.2811,
          color: '#ef4444'
        },
        {
          id: 'ac-m2',
          titulo: 'DIV02',
          detalle: 'Cobertura reforzada y en monitoreo.',
          unidad: 'DIV02',
          prioridad: 'alta',
          estado: 'monitoreo',
          latitud: 3.4516,
          longitud: -76.532,
          color: '#fb7185'
        }
      ],
      timeline: [
        {
          id: 'ac-l1',
          titulo: 'Escalamiento a comando',
          descripcion: 'Se habilita protocolo de priorizacion y verificacion de terreno.',
          hora: '20:07'
        },
        {
          id: 'ac-l2',
          titulo: 'Confirmacion de indicio',
          descripcion: 'Analitica cruza fuente tecnica y reporte territorial.',
          hora: '19:52'
        }
      ]
    };
  }

  private crearEventosExde(): SeguimientoSubmenu {
    return {
      id: 'eventos-exde',
      nombre: 'Eventos EXDE',
      descripcion: 'Concentrador de eventos EXDE, novedades, historial reciente y correlacion operacional.',
      icono: 'bi-activity',
      estado: 'Analitica tactica',
      etiqueta: 'Seguimiento especializado',
      resumen: 'Modulo listo para desacoplarse en componentes independientes, conectarse a mapas y consumir flujos desde backend.',
      metricas: [
        { label: 'Fuentes', valor: 'API + WS', tendencia: 'Arquitectura preparada' },
        { label: 'Capas mapa', valor: 'Leaflet', tendencia: 'Compatibilidad prevista' },
        { label: 'Integracion', valor: 'FastAPI', tendencia: 'Servicios modulares' }
      ],
      cards: [
        {
          id: 'ex-1',
          titulo: 'Puntos de interes',
          valor: '14',
          descripcion: 'Concentraciones observadas en el lapso tactico.',
          icono: 'bi-geo-alt',
          tono: 'info'
        },
        {
          id: 'ex-2',
          titulo: 'Eventos confirmados',
          valor: '06',
          descripcion: 'Registros con validacion cruzada y trazabilidad operativa.',
          icono: 'bi-shield-exclamation',
          tono: 'alerta'
        }
      ],
      capacidades: [
        'Espacio para timeline de eventos EXDE',
        'Preparado para mapas de calor y georreferenciacion',
        'Listo para dividir en subcomponentes por dominio'
      ],
      alertas: [
        {
          id: 'ex-a1',
          titulo: 'Hallazgo correlacionado',
          detalle: 'Patron repetido en corredor logístico con dos fuentes independientes.',
          tiempo: 'Hace 22 min',
          severidad: 'media',
          estado: 'activo',
          unidad: 'DIV03'
        }
      ],
      tabla: [
        {
          id: 'ex-t1',
          unidad: 'DIV03',
          sector: 'Corredor logístico',
          estado: 'activo',
          prioridad: 'media',
          actualizacion: '19:44',
          detalle: 'Evento correlacionado pendiente de ampliacion'
        }
      ],
      marcadores: [
        {
          id: 'ex-m1',
          titulo: 'Corredor logístico',
          detalle: 'Concentracion de observaciones EXDE.',
          unidad: 'DIV03',
          prioridad: 'media',
          estado: 'activo',
          latitud: 8.7479,
          longitud: -75.8814,
          color: '#38bdf8'
        }
      ],
      timeline: [
        {
          id: 'ex-l1',
          titulo: 'Cruce de fuentes',
          descripcion: 'Se actualiza matriz de correlacion y priorizacion.',
          hora: '19:31'
        }
      ]
    };
  }

  private crearMovimientoEnCero(): SeguimientoSubmenu {
    return {
      id: 'unidades-movimiento-cero',
      nombre: 'Unidades Movimiento en Cero',
      descripcion: 'Deteccion de unidades sin desplazamiento y visualizacion para control de estabilidad operacional.',
      icono: 'bi-pause-circle',
      estado: 'Supervision logistica',
      etiqueta: 'Control de movilidad',
      resumen: 'Vista pensada para reglas de permanencia, alertas automaticas y consulta detallada por unidad.',
      metricas: [
        { label: 'Horizonte', valor: '72 h', tendencia: 'Analisis configurable' },
        { label: 'Cobertura', valor: 'Nacional', tendencia: 'Escalable por jurisdiccion' },
        { label: 'Estado', valor: 'Listo', tendencia: 'Base visual preparada' }
      ],
      cards: [
        {
          id: 'mc-1',
          titulo: 'Unidades estaticas',
          valor: '07',
          descripcion: 'Sin variacion relevante de posicion durante el lapso base.',
          icono: 'bi-pause-circle',
          tono: 'alerta'
        },
        {
          id: 'mc-2',
          titulo: 'Seguimiento normal',
          valor: '12',
          descripcion: 'Con trazabilidad estable y control de permanencia.',
          icono: 'bi-truck',
          tono: 'estable'
        }
      ],
      capacidades: [
        'Preparado para integrar telemetria y posicionamiento',
        'Soporta crecimiento a widgets de mantenimiento y disponibilidad',
        'Compatible con indicadores operacionales por unidad'
      ],
      alertas: [
        {
          id: 'mc-a1',
          titulo: 'Unidad sin variacion superior al umbral',
          detalle: 'Se mantiene posicion estatica y requiere contraste con orden de operaciones.',
          tiempo: 'Hace 38 min',
          severidad: 'media',
          estado: 'activo',
          unidad: 'BR09'
        }
      ],
      tabla: [
        {
          id: 'mc-t1',
          unidad: 'BR09',
          sector: 'Cordón occidental',
          estado: 'activo',
          prioridad: 'media',
          actualizacion: '19:28',
          detalle: 'Verificar permanencia autorizada'
        }
      ],
      marcadores: [
        {
          id: 'mc-m1',
          titulo: 'BR09',
          detalle: 'Unidad con permanencia sin cambio de posicion.',
          unidad: 'BR09',
          prioridad: 'media',
          estado: 'activo',
          latitud: 10.391,
          longitud: -75.4794,
          color: '#f59e0b'
        }
      ],
      timeline: [
        {
          id: 'mc-l1',
          titulo: 'Regla de permanencia disparada',
          descripcion: 'Se habilita validacion de movilidad y confirmacion con unidad.',
          hora: '19:12'
        }
      ]
    };
  }

  private crearUnidadesReducidas(): SeguimientoSubmenu {
    return {
      id: 'unidades-reducidas',
      nombre: 'Unidades Reducidas',
      descripcion: 'Seguimiento de unidades con reduccion de capacidad, novedades de personal y afectacion operacional.',
      icono: 'bi-speedometer2',
      estado: 'Vigilancia estructural',
      etiqueta: 'Capacidad reducida',
      resumen: 'Seccion pensada para alimentar cuadros de mando, integrarse con permisos y reflejar estado consolidado.',
      metricas: [
        { label: 'Indicadores', valor: '08', tendencia: 'Base de dashboard' },
        { label: 'Permisos', valor: 'RBAC', tendencia: 'Listo para roles' },
        { label: 'Extensiones', valor: 'Modular', tendencia: 'Subcomponentes futuros' }
      ],
      cards: [
        {
          id: 'ur-1',
          titulo: 'Capacidad afectada',
          valor: '63%',
          descripcion: 'Promedio de disponibilidad consolidada en unidades priorizadas.',
          icono: 'bi-speedometer2',
          tono: 'critico'
        },
        {
          id: 'ur-2',
          titulo: 'Unidades en recuperacion',
          valor: '04',
          descripcion: 'Con plan de nivelacion y revisiones de mando.',
          icono: 'bi-bar-chart-line',
          tono: 'alerta'
        }
      ],
      capacidades: [
        'Preparado para dashboard operacional ejecutivo',
        'Listo para integracion con modulos de analitica y reportes',
        'Compatible con microfrontends o cargas diferidas'
      ],
      alertas: [
        {
          id: 'ur-a1',
          titulo: 'Reduccion sostenida de disponibilidad',
          detalle: 'Se requiere seguimiento de mando sobre capacidad de respuesta territorial.',
          tiempo: 'Hace 14 min',
          severidad: 'alta',
          estado: 'activo',
          unidad: 'FUDAT'
        }
      ],
      tabla: [
        {
          id: 'ur-t1',
          unidad: 'FUDAT',
          sector: 'Cobertura oriental',
          estado: 'activo',
          prioridad: 'alta',
          actualizacion: '20:01',
          detalle: 'Capacidad reducida por novedad de personal'
        }
      ],
      marcadores: [
        {
          id: 'ur-m1',
          titulo: 'FUDAT',
          detalle: 'Unidad en seguimiento por reduccion de capacidad.',
          unidad: 'FUDAT',
          prioridad: 'alta',
          estado: 'activo',
          latitud: 6.2518,
          longitud: -75.5636,
          color: '#ef4444'
        }
      ],
      timeline: [
        {
          id: 'ur-l1',
          titulo: 'Actualizacion de cuadro de capacidad',
          descripcion: 'Se consolida novedad de personal y respuesta asociada.',
          hora: '19:57'
        }
      ]
    };
  }
}
