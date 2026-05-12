import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin, map, Observable, of } from 'rxjs';
import {
  ActualizacionRegistroPlano,
  EnemigoEstructuraRegistroPlano,
  EnemigoRegistroPlano,
  EstrategiaAfectaRegistroPlano,
  HechoRegistroPlano,
  OperacionRegistroPlano,
  SubRegionRegistro,
  TipoOperacionRegistroPlano,
  UnidadesTreeService
} from './unidades-tree.service';

export interface PermisoAcceso {
  id?: number;
  menu: string;
  nombre: string;
  ruta: string;
  tiene_permiso?: boolean;
  puede_ver?: boolean;
  puede_crear?: boolean;
  puede_editar?: boolean;
  puede_eliminar?: boolean;
}

export interface UsuarioAutenticado {
  usuario: string;
  unidad: string;
  nivel_per_uni: string | null;
  unida_per: string | null;
  unidades?: unknown;
  enemigo?: EnemigoRegistroPlano[] | unknown;
  enemigo_estructura?: EnemigoEstructuraRegistroPlano[] | unknown;
  operacion?: OperacionRegistroPlano[] | unknown;
  estrategia_afecta?: EstrategiaAfectaRegistroPlano[] | unknown;
  tipo_operacion?: TipoOperacionRegistroPlano[] | unknown;
  hecho?: HechoRegistroPlano[] | unknown;
  actualizacion?: ActualizacionRegistroPlano[] | unknown;
  sub_regiones?: SubRegionRegistro[] | unknown;
}

interface PaginaBackend {
  id?: number;
  menu?: string;
  nombre?: string;
  ruta: string;
}

interface UsuarioBackendConPermisos {
  usuario?: string;
  permisos?: Record<string, {
    tiene_permiso?: boolean;
    puede_ver?: boolean;
    puede_crear?: boolean;
    puede_editar?: boolean;
    puede_eliminar?: boolean;
  }> | PermisoAcceso[];
}

export interface LoginResponse {
  access_token: string;
  user?: UsuarioAutenticado & {
    permisos?: PermisoAcceso[];
  };
  permisos?: PermisoAcceso[];
  usuario?: string;
  unidad?: string;
  nivel_per_uni?: string | null;
  unida_per?: string | null;
  unidades?: unknown;
  enemigo?: EnemigoRegistroPlano[] | unknown;
  enemigo_estructura?: EnemigoEstructuraRegistroPlano[] | unknown;
  operacion?: OperacionRegistroPlano[] | unknown;
  estrategia_afecta?: EstrategiaAfectaRegistroPlano[] | unknown;
  tipo_operacion?: TipoOperacionRegistroPlano[] | unknown;
  hecho?: HechoRegistroPlano[] | unknown;
  actualizacion?: ActualizacionRegistroPlano[] | unknown;
  sub_regiones?: SubRegionRegistro[] | unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Punto central de permisos en frontend:
  // - Sidebar y acceso a rutas usan `tienePermisoPagina()`
  // - Acciones CRUD dentro de componentes usan `puede_ver|crear|editar|eliminar`
  // - Si login no retorna permisos, se reconstruyen con `cargarPermisosDesdeFrontend()`

  constructor(
    private http: HttpClient,
    private unidadesTreeService: UnidadesTreeService
  ) {}

  guardarPermisos(permisos: PermisoAcceso[]) {
    localStorage.setItem('permisos', JSON.stringify(this.normalizarPermisos(permisos)));
  }

  resolverPermisosLogin(response: LoginResponse): PermisoAcceso[] {
    const permisos = this.extraerPermisosDesdeRespuesta(response);

    if (permisos.length > 0) {
      return this.normalizarPermisos(permisos);
    }

    // Fallback defensivo: si el backend autentica pero no retorna permisos,
    // permitimos al menos la pantalla principal para no bloquear el ingreso.
    return this.normalizarPermisos([
      {
        menu: 'HOME',
        nombre: 'Home',
        ruta: '/home',
        tiene_permiso: true,
        puede_ver: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false
      }
    ]);
  }

  respuestaIncluyePermisos(response: LoginResponse): boolean {
    return this.extraerPermisosDesdeRespuesta(response).length > 0;
  }

  resolverUsuarioLogin(response: LoginResponse): UsuarioAutenticado | null {
    if (response.user?.usuario || response.user?.unidad) {
      return {
        usuario: response.user.usuario,
        unidad: response.user.unidad,
        nivel_per_uni: response.user.nivel_per_uni ?? null,
        unida_per: response.user.unida_per ?? null,
        unidades: response.user.unidades,
        enemigo: this.resolverCatalogoPlano(response.user, ['enemigo']),
        enemigo_estructura: this.resolverCatalogoPlano(response.user, ['enemigo_estructura', 'ene_estructura', 'enemigoEstructura', 'estructura_enemigo', 'estructura']),
        operacion: this.resolverCatalogoPlano(response.user, ['operacion', 'operación']),
        estrategia_afecta: this.resolverCatalogoPlano(response.user, ['estrategia_afecta', 'estrategiaAfecta', 'estrategia']),
        tipo_operacion: this.resolverCatalogoPlano(response.user, ['tipo_operacion', 'tipoOperacion', 'tipo']),
        hecho: this.resolverCatalogoPlano(response.user, ['hecho']),
        actualizacion: this.resolverCatalogoPlano(response.user, ['actualizacion', 'actualización']),
        sub_regiones: this.resolverCatalogoPlano(response.user, ['sub_regiones', 'subregiones'])
      };
    }

    if (response.usuario || response.unidad) {
      return {
        usuario: response.usuario || 'Usuario',
        unidad: response.unidad || 'Unidad no registrada',
        nivel_per_uni: response.nivel_per_uni ?? null,
        unida_per: response.unida_per ?? null,
        unidades: response.unidades,
        enemigo: this.resolverCatalogoPlano(response, ['enemigo']),
        enemigo_estructura: this.resolverCatalogoPlano(response, ['enemigo_estructura', 'ene_estructura', 'enemigoEstructura', 'estructura_enemigo', 'estructura']),
        operacion: this.resolverCatalogoPlano(response, ['operacion', 'operación']),
        estrategia_afecta: this.resolverCatalogoPlano(response, ['estrategia_afecta', 'estrategiaAfecta', 'estrategia']),
        tipo_operacion: this.resolverCatalogoPlano(response, ['tipo_operacion', 'tipoOperacion', 'tipo']),
        hecho: this.resolverCatalogoPlano(response, ['hecho']),
        actualizacion: this.resolverCatalogoPlano(response, ['actualizacion', 'actualización']),
        sub_regiones: this.resolverCatalogoPlano(response, ['sub_regiones', 'subregiones'])
      };
    }

    return null;
  }

  obtenerPermisos(): PermisoAcceso[] {
    const raw = localStorage.getItem('permisos');

    try {
      const permisos = raw ? JSON.parse(raw) : [];
      return this.normalizarPermisos(permisos);
    } catch {
      return [];
    }
  }

  tienePermisoPagina(permiso?: PermisoAcceso | null): boolean {
    if (!permiso) {
      return false;
    }

    // Regla de visibilidad de pagina:
    // una ruta se considera habilitada si backend marca `tiene_permiso`
    // o si solo expone `puede_ver` como indicador de acceso a la pagina.
    return Boolean(permiso.tiene_permiso || permiso.puede_ver);
  }

  obtenerPermisoRuta(ruta: string): PermisoAcceso | null {
    const rutaNormalizada = this.normalizarRuta(ruta);
    const coincidenciaExacta = this.obtenerPermisos().find(
      (permiso) => this.normalizarRuta(permiso.ruta) === rutaNormalizada
    );

    if (coincidenciaExacta) {
      return coincidenciaExacta;
    }

    return this.obtenerPermisos().find((permiso) => {
      const rutaPermitida = this.normalizarRuta(permiso.ruta);
      return rutaNormalizada.startsWith(`${rutaPermitida}/`) || rutaPermitida.startsWith(`${rutaNormalizada}/`);
    }) || null;
  }

  login(usuario: string, password: string, captchaToken: string | null) {
    const url = `${environment.apiBase}${environment.services?.auth ?? '/login'}`;

    return this.http.post<LoginResponse>(url, {
      username: usuario,
      password: password,
      captchaToken: captchaToken
    });
  }

  cargarPermisosDesdeFrontend(usuario: string): Observable<PermisoAcceso[]> {
    const apiUsuarios = `${environment.apiBase}${environment.services?.usuarios ?? '/usuarios'}`;

    // Fallback 100% frontend:
    // cuando /login no devuelve permisos, el front consulta usuarios y paginas,
    // ubica el usuario autenticado y reconstruye el arreglo que consumen
    // sidebar, guard y componentes.
    return forkJoin({
      usuarios: this.http.get<UsuarioBackendConPermisos[]>(`${apiUsuarios}/usuarios`),
      paginas: this.http.get<PaginaBackend[]>(`${apiUsuarios}/paginas`)
    }).pipe(
      map(({ usuarios, paginas }) => {
        const usuarioActual = usuarios.find((item) => item.usuario === usuario);

        if (!usuarioActual?.permisos) {
          return this.normalizarPermisos([]);
        }

        if (Array.isArray(usuarioActual.permisos)) {
          return this.normalizarPermisos(usuarioActual.permisos);
        }

        const permisos = Object.entries(usuarioActual.permisos).map(([ruta, permiso]) => {
          const pagina = paginas.find((item) => this.normalizarRuta(item.ruta) === this.normalizarRuta(ruta));

          return {
            id: pagina?.id,
            menu: pagina?.menu || 'General',
            nombre: pagina?.nombre || ruta,
            ruta,
            tiene_permiso: permiso?.tiene_permiso ?? false,
            puede_ver: permiso?.puede_ver ?? false,
            puede_crear: permiso?.puede_crear ?? false,
            puede_editar: permiso?.puede_editar ?? false,
            puede_eliminar: permiso?.puede_eliminar ?? false
          } satisfies PermisoAcceso;
        });

        return this.normalizarPermisos(permisos);
      })
    );
  }

  guardarToken(token: string) {
    localStorage.setItem('token', token);
  }

  guardarUsuario(usuario: string) {
    localStorage.setItem('usuario', usuario);
  }

  guardarPerfilUsuario(user?: UsuarioAutenticado | null, fallbackUsuario = 'Usuario') {
    if (!user) {
      this.guardarUsuario(fallbackUsuario);
      this.guardarUnidad('Unidad no registrada');
      localStorage.removeItem('nivel_per_uni');
      localStorage.removeItem('unida_per');
      localStorage.removeItem('unidades');
      localStorage.removeItem('enemigo');
      localStorage.removeItem('enemigo_estructura');
      localStorage.removeItem('operacion');
      localStorage.removeItem('estrategia_afecta');
      localStorage.removeItem('tipo_operacion');
      localStorage.removeItem('hecho');
      localStorage.removeItem('actualizacion');
      localStorage.removeItem('sub_regiones');
      return;
    }

    this.guardarUsuario(user.usuario || fallbackUsuario);
    this.guardarUnidad(user.unidad || 'Unidad no registrada');
    localStorage.setItem('nivel_per_uni', user.nivel_per_uni ?? '');
    localStorage.setItem('unida_per', user.unida_per ?? '');
    localStorage.setItem('unidades', JSON.stringify(user.unidades ?? []));
    const enemigosNormalizados = this.unidadesTreeService.normalizarEnemigo(user.enemigo);
    const estructurasNormalizadas = this.unidadesTreeService.normalizarEnemigoEstructura(
      Array.isArray(user.enemigo_estructura) && user.enemigo_estructura.length
        ? user.enemigo_estructura
        : user.enemigo
    );

    // --- CORRECCIÓN: Mapear hop_operacion a operacion antes de normalizar ---
    let operacionesRaw = user.operacion;
    if (Array.isArray(operacionesRaw) && operacionesRaw.length && operacionesRaw[0]?.hop_operacion) {
      operacionesRaw = operacionesRaw.map((item: any) => ({ operacion: item.hop_operacion }));
    }

    localStorage.setItem('enemigo', JSON.stringify(enemigosNormalizados));
    localStorage.setItem('enemigo_estructura', JSON.stringify(estructurasNormalizadas));
    localStorage.setItem('operacion', JSON.stringify(this.unidadesTreeService.normalizarOperacion(operacionesRaw)));
    localStorage.setItem('estrategia_afecta', JSON.stringify(this.unidadesTreeService.normalizarEstrategiaAfecta(user.estrategia_afecta)));
    localStorage.setItem('tipo_operacion', JSON.stringify(this.unidadesTreeService.normalizarTipoOperacion(user.tipo_operacion)));
    localStorage.setItem('hecho', JSON.stringify(this.unidadesTreeService.normalizarHecho(user.hecho)));
    localStorage.setItem('actualizacion', JSON.stringify(this.unidadesTreeService.normalizarActualizacion(user.actualizacion)));
    localStorage.setItem('sub_regiones', JSON.stringify(this.unidadesTreeService.normalizarSubRegiones(user.sub_regiones)));
  }

  guardarUsuarioDesdeToken(token: string, fallback = 'Usuario') {
    const payload = this.obtenerPayloadToken(token);
    const usuario = payload?.['sub'] || fallback;
    const unidad = payload?.['unidad'] || 'Unidad no registrada';

    this.guardarUsuario(String(usuario));
    this.guardarUnidad(String(unidad));
  }

  guardarUnidad(unidad: string) {
    localStorage.setItem('unidad', unidad);
  }

  obtenerToken() {
    return localStorage.getItem('token');
  }

  obtenerUsuario() {
    return localStorage.getItem('usuario');
  }

  obtenerUnidad() {
    return localStorage.getItem('unidad');
  }

  obtenerNivelPermisoUnidad() {
    return localStorage.getItem('nivel_per_uni');
  }

  obtenerUnidadPermiso() {
    return localStorage.getItem('unida_per');
  }
obtenerOperacionesUsuario(): unknown[] {
    const raw = localStorage.getItem('operacion');
    
    try { 
      const operaciones = raw ? JSON.parse(raw) : [];
      return Array.isArray(operaciones) ? operaciones : [];
    } catch {
      return [];
    }
  }
  obtenerUnidadesUsuario(): unknown[] {
    const raw = localStorage.getItem('unidades');

    try {
      const unidades = raw ? JSON.parse(raw) : [];
      return Array.isArray(unidades) ? unidades : [];
    } catch {
      return [];
    }
  }
  obtenerEnemigoUsuario(): EnemigoRegistroPlano[] {
    const raw = localStorage.getItem('enemigo');

    try {
      const enemigos = raw ? JSON.parse(raw) : [];
      return this.unidadesTreeService.normalizarEnemigo(enemigos);
    } catch {
      return [];
    }
  }

  obtenerEnemigoEstructuraUsuario(): EnemigoEstructuraRegistroPlano[] {
    return this.unidadesTreeService.obtenerEnemigoEstructuraDesdeStorage();
  }

  obtenerOperacionUsuario(): OperacionRegistroPlano[] {
    return this.unidadesTreeService.obtenerOperacionDesdeStorage();
  }

  obtenerEstrategiaAfectaUsuario(): EstrategiaAfectaRegistroPlano[] {
    return this.unidadesTreeService.obtenerEstrategiaAfectaDesdeStorage();
  }

  obtenerTipoOperacionUsuario(): TipoOperacionRegistroPlano[] {
    return this.unidadesTreeService.obtenerTipoOperacionDesdeStorage();
  }

  obtenerHechoUsuario(): HechoRegistroPlano[] {
    return this.unidadesTreeService.obtenerHechoDesdeStorage();
  }

  obtenerActualizacionUsuario(): ActualizacionRegistroPlano[] {
    return this.unidadesTreeService.obtenerActualizacionDesdeStorage();
  }

  obtenerSubRegionesUsuario(): SubRegionRegistro[] {
    return this.unidadesTreeService.obtenerSubRegionesDesdeStorage();
  }

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  tieneAccesoRuta(ruta: string): boolean {
    const rutaNormalizada = this.normalizarRuta(ruta);
    return this.obtenerPermisos().some((permiso) => {
      if (!this.tienePermisoPagina(permiso)) {
        return false;
      }

      const rutaPermitida = this.normalizarRuta(permiso.ruta);
      return rutaNormalizada === rutaPermitida
        || rutaNormalizada.startsWith(`${rutaPermitida}/`)
        || rutaPermitida.startsWith(`${rutaNormalizada}/`);
    });
  }

  obtenerPrimeraRutaPermitida(): string {
    const permisos = this.obtenerPermisos();

    if (permisos.length === 0) {
      return this.estaAutenticado() ? '/home' : '/login';
    }

    const permisoHome = permisos.find((permiso) =>
      this.normalizarRuta(permiso.ruta) === '/home' && this.tienePermisoPagina(permiso)
    );

    if (permisoHome) {
      return permisoHome.ruta;
    }

    return permisos.find((permiso) => this.tienePermisoPagina(permiso))?.ruta || '/login';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('unidad');
    localStorage.removeItem('nivel_per_uni');
    localStorage.removeItem('unida_per');
    localStorage.removeItem('unidades');
    localStorage.removeItem('permisos');
    localStorage.removeItem('enemigo');
    localStorage.removeItem('enemigo_estructura');
    localStorage.removeItem('operacion');
    localStorage.removeItem('estrategia_afecta');
    localStorage.removeItem('tipo_operacion');
    localStorage.removeItem('hecho');
    localStorage.removeItem('actualizacion');
    localStorage.removeItem('sub_regiones');
  }

  private normalizarPermisos(permisos: PermisoAcceso[] = []): PermisoAcceso[] {
    return permisos.map((permiso) => ({
      ...permiso,
      menu: permiso.menu || 'General',
      nombre: permiso.nombre || permiso.ruta || 'Sin nombre',
      ruta: this.normalizarRuta(permiso.ruta),
      tiene_permiso: Boolean(permiso.tiene_permiso),
      puede_ver: Boolean(permiso.puede_ver),
      puede_crear: permiso.puede_crear ?? false,
      puede_editar: permiso.puede_editar ?? false,
      puede_eliminar: permiso.puede_eliminar ?? false
    }));
  }

  private normalizarRuta(ruta: string | undefined | null): string {
    if (!ruta) {
      return '/';
    }

    return ruta.startsWith('/') ? ruta : `/${ruta}`;
  }

  private extraerPermisosDesdeRespuesta(response: LoginResponse): PermisoAcceso[] {
    const posiblesPermisos = [
      response.permisos,
      response.user?.permisos
    ];

    for (const permisos of posiblesPermisos) {
      if (Array.isArray(permisos)) {
        return permisos;
      }
    }

    return [];
  }

  private resolverCatalogoPlano(source: unknown, aliases: string[]): unknown[] {
    return this.buscarArregloCatalogo(source, aliases) || [];
  }

  private buscarArregloCatalogo(source: unknown, aliases: string[], visited = new Set<unknown>()): unknown[] | null {
    if (!source || visited.has(source)) {
      return null;
    }

    if (Array.isArray(source)) {
      return source;
    }

    if (typeof source !== 'object') {
      return null;
    }

    visited.add(source);
    const registro = source as Record<string, unknown>;

    for (const alias of aliases) {
      const directValue = registro[alias];

      if (Array.isArray(directValue)) {
        return directValue;
      }

      const nestedDirect = this.buscarArregloCatalogo(directValue, aliases, visited);
      if (nestedDirect?.length) {
        return nestedDirect;
      }
    }

    for (const value of Object.values(registro)) {
      const nestedValue = this.buscarArregloCatalogo(value, aliases, visited);
      if (nestedValue?.length) {
        return nestedValue;
      }
    }

    return null;
  }

  private obtenerPayloadToken(token: string): Record<string, unknown> | null {
    const payloadBase64Url = token.split('.')[1];

    if (!payloadBase64Url) {
      return null;
    }

    try {
      const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join('')
      );

      return JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
