import { Injectable } from '@angular/core';

export interface UnidadRegistroPlano {
  agr_div: string;
  division: string;
  brigada: string;
  unidad: string;
  dpto: string;
  mpio: string;
}

export interface EnemigoRegistroPlano {
  enemigo: string;
  ene_estructura?: string;
}

export interface EnemigoEstructuraRegistroPlano {
  enemigo_estructura: string;
}

export interface OperacionRegistroPlano {
  operacion: string;
}

export interface EstrategiaAfectaRegistroPlano {
  estrategia_afecta: string;
}

export interface TipoOperacionRegistroPlano {
  tipo_operacion: string;
}

export interface HechoRegistroPlano {
  hecho: string;
}

export interface ActualizacionRegistroPlano {
  actualizacion: string;
}

export interface SubRegionDepartamento {
  nombre: string;
  municipios: string[];
}

export interface SubRegionRegistro {
  id?: number;
  nombre: string;
  departamentos: SubRegionDepartamento[];
}

export interface UnidadUbicacion {
  dpto: string;
  mpio: string;
}

export interface UnidadNodo {
  unidad: string;
  ubicaciones: UnidadUbicacion[];
}

export interface BrigadaNodo {
  brigada: string;
  unidades: UnidadNodo[];
}

export interface DivisionNodo {
  division: string;
  brigadas: BrigadaNodo[];
}

export interface AgrDivisionNodo {
  agr_div: string;
  divisiones: DivisionNodo[];
}

@Injectable({
  providedIn: 'root'
})
export class UnidadesTreeService {
  // Este servicio transforma la lista plana del backend a una jerarquia:
  // agr_div -> division -> brigada -> unidad -> ubicaciones(dpto/mpio)
  // Tambien centraliza la normalizacion de catalogos planos del login:
  // enemigo, enemigo_estructura, operacion, estrategia_afecta,
  // tipo_operacion, hecho, actualizacion y sub_regiones.

  normalizarEnemigo(input: unknown): EnemigoRegistroPlano[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => this.normalizarRegistroEnemigo(item))
      .filter((item): item is EnemigoRegistroPlano => item !== null);
  }

  obtenerEnemigosDesdeStorage(storageKey = 'enemigo'): EnemigoRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'enemigo', EnemigoRegistroPlano>(
      storageKey,
      'enemigo',
      ['enemigo', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresEnemigo(input: unknown): string[] {
    return Array.from(
      new Set(this.normalizarEnemigo(input).map((item) => item.enemigo))
    ).sort((a, b) => a.localeCompare(b));
  }

  obtenerNombresEnemigoDesdeStorage(storageKey = 'enemigo'): string[] {
    return this.obtenerNombresEnemigo(this.obtenerEnemigosDesdeStorage(storageKey));
  }

  normalizarEnemigoEstructura(input: unknown): EnemigoEstructuraRegistroPlano[] {
    const registros = this.normalizarEnemigo(input);
    return registros
      .map((item) => {
        const estructura = this.normalizarTexto(item.ene_estructura);
        return estructura ? { enemigo_estructura: estructura } : null;
      })
      .filter((item): item is EnemigoEstructuraRegistroPlano => item !== null);
  }

  obtenerEnemigoEstructuraDesdeStorage(storageKey = 'enemigo_estructura'): EnemigoEstructuraRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'enemigo_estructura', EnemigoEstructuraRegistroPlano>(
      storageKey,
      'enemigo_estructura',
      ['enemigo_estructura', 'ene_estructura', 'enemigoEstructura', 'estructura', 'enemigo', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresEnemigoEstructura(input: unknown): string[] {
    return Array.from(
      new Set(this.normalizarEnemigoEstructura(input).map((item) => item.enemigo_estructura))
    ).sort((a, b) => a.localeCompare(b));
  }

  obtenerNombresEnemigoEstructuraDesdeStorage(storageKey = 'enemigo_estructura'): string[] {
    return this.obtenerNombresEnemigoEstructura(this.obtenerEnemigoEstructuraDesdeStorage(storageKey));
  }

  obtenerNombresEnemigoEstructuraPorEnemigos(input: unknown, enemigos: string[]): string[] {
    const enemigosActivos = new Set(
      enemigos
        .map((item) => this.normalizarTexto(item))
        .filter(Boolean)
    );

    return Array.from(
      new Set(
        this.normalizarEnemigo(input)
          .filter((item) => !enemigosActivos.size || enemigosActivos.has(item.enemigo))
          .map((item) => this.normalizarTexto(item.ene_estructura))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  obtenerMapaEnemigoEstructura(input: unknown): Record<string, string[]> {
    const mapa = new Map<string, Set<string>>();

    for (const item of this.normalizarEnemigo(input)) {
      const enemigo = this.normalizarTexto(item.enemigo);
      const estructura = this.normalizarTexto(item.ene_estructura);

      if (!enemigo) {
        continue;
      }

      if (!mapa.has(enemigo)) {
        mapa.set(enemigo, new Set<string>());
      }

      if (estructura) {
        mapa.get(enemigo)!.add(estructura);
      }
    }

    return Object.fromEntries(
      Array.from(mapa.entries()).map(([enemigo, estructuras]) => [
        enemigo,
        Array.from(estructuras).sort((a, b) => a.localeCompare(b))
      ])
    );
  }

  normalizarOperacion(input: unknown): OperacionRegistroPlano[] {
    return this.normalizarCatalogoConAliases<'operacion', OperacionRegistroPlano>(
      input,
      'operacion',
      ['operacion', 'operación', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerOperacionDesdeStorage(storageKey = 'operacion'): OperacionRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'operacion', OperacionRegistroPlano>(
      storageKey,
      'operacion',
      ['operacion', 'operación', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresOperacion(input: unknown): string[] {
    return this.obtenerNombresCatalogoConAliases<'operacion', OperacionRegistroPlano>(
      input,
      'operacion',
      ['operacion', 'operación', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresOperacionDesdeStorage(storageKey = 'operacion'): string[] {
    return this.obtenerNombresOperacion(this.obtenerOperacionDesdeStorage(storageKey));
  }
obtenerTiposOperacionDesdeStorage(storageKey = 'tipo_operacion'): string[] {
    return this.obtenerNombresTipoOperacion(this.obtenerTipoOperacionDesdeStorage(storageKey));
  }
  normalizarEstrategiaAfecta(input: unknown): EstrategiaAfectaRegistroPlano[] {
    return this.normalizarCatalogoConAliases<'estrategia_afecta', EstrategiaAfectaRegistroPlano>(
      input,
      'estrategia_afecta',
      ['estrategia_afecta', 'estrategiaAfecta', 'estrategia', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerEstrategiaAfectaDesdeStorage(storageKey = 'estrategia_afecta'): EstrategiaAfectaRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'estrategia_afecta', EstrategiaAfectaRegistroPlano>(
      storageKey,
      'estrategia_afecta',
      ['estrategia_afecta', 'estrategiaAfecta', 'estrategia', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresEstrategiaAfecta(input: unknown): string[] {
    return this.obtenerNombresCatalogoConAliases<'estrategia_afecta', EstrategiaAfectaRegistroPlano>(
      input,
      'estrategia_afecta',
      ['estrategia_afecta', 'estrategiaAfecta', 'estrategia', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresEstrategiaAfectaDesdeStorage(storageKey = 'estrategia_afecta'): string[] {
    return this.obtenerNombresEstrategiaAfecta(this.obtenerEstrategiaAfectaDesdeStorage(storageKey));
  }

  normalizarTipoOperacion(input: unknown): TipoOperacionRegistroPlano[] {
    return this.normalizarCatalogoConAliases<'tipo_operacion', TipoOperacionRegistroPlano>(
      input,
      'tipo_operacion',
      ['tipo_operacion', 'tipoOperacion', 'tipo', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerTipoOperacionDesdeStorage(storageKey = 'tipo_operacion'): TipoOperacionRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'tipo_operacion', TipoOperacionRegistroPlano>(
      storageKey,
      'tipo_operacion',
      ['tipo_operacion', 'tipoOperacion', 'tipo', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresTipoOperacion(input: unknown): string[] {
    return this.obtenerNombresCatalogoConAliases<'tipo_operacion', TipoOperacionRegistroPlano>(
      input,
      'tipo_operacion',
      ['tipo_operacion', 'tipoOperacion', 'tipo', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresTipoOperacionDesdeStorage(storageKey = 'tipo_operacion'): string[] {
    // Siempre devolver solo los strings tipo_operacion, aunque el formato sea inesperado
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return Array.from(new Set(arr.map((item: any) => item?.tipo_operacion).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      }
      return [];
    } catch {
      return [];
    }
  }

  normalizarHecho(input: unknown): HechoRegistroPlano[] {
    return this.normalizarCatalogoConAliases<'hecho', HechoRegistroPlano>(
      input,
      'hecho',
      ['hecho', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerHechoDesdeStorage(storageKey = 'hecho'): HechoRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'hecho', HechoRegistroPlano>(
      storageKey,
      'hecho',
      ['hecho', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresHecho(input: unknown): string[] {
    return this.obtenerNombresCatalogoConAliases<'hecho', HechoRegistroPlano>(
      input,
      'hecho',
      ['hecho', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresHechoDesdeStorage(storageKey = 'hecho'): string[] {
    return this.obtenerNombresHecho(this.obtenerHechoDesdeStorage(storageKey));
  }

  normalizarActualizacion(input: unknown): ActualizacionRegistroPlano[] {
    return this.normalizarCatalogoConAliases<'actualizacion', ActualizacionRegistroPlano>(
      input,
      'actualizacion',
      ['actualizacion', 'actualización', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerActualizacionDesdeStorage(storageKey = 'actualizacion'): ActualizacionRegistroPlano[] {
    return this.obtenerCatalogoDesdeStorageConAliases<'actualizacion', ActualizacionRegistroPlano>(
      storageKey,
      'actualizacion',
      ['actualizacion', 'actualización', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresActualizacion(input: unknown): string[] {
    return this.obtenerNombresCatalogoConAliases<'actualizacion', ActualizacionRegistroPlano>(
      input,
      'actualizacion',
      ['actualizacion', 'actualización', 'nombre', 'valor', 'descripcion']
    );
  }

  obtenerNombresActualizacionDesdeStorage(storageKey = 'actualizacion'): string[] {
    return this.obtenerNombresActualizacion(this.obtenerActualizacionDesdeStorage(storageKey));
  }

  normalizarSubRegiones(input: unknown): SubRegionRegistro[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => this.normalizarRegistroSubRegion(item))
      .filter((item): item is SubRegionRegistro => item !== null);
  }

  obtenerSubRegionesDesdeStorage(storageKey = 'sub_regiones'): SubRegionRegistro[] {
    const raw = localStorage.getItem(storageKey);

    try {
      const items = raw ? JSON.parse(raw) : [];
      return this.normalizarSubRegiones(items);
    } catch {
      return [];
    }
  }

  obtenerNombresSubRegiones(input: unknown): string[] {
    return Array.from(
      new Set(this.normalizarSubRegiones(input).map((item) => item.nombre))
    ).sort((a, b) => a.localeCompare(b));
  }

  obtenerNombresSubRegionesDesdeStorage(storageKey = 'sub_regiones'): string[] {
    return this.obtenerNombresSubRegiones(this.obtenerSubRegionesDesdeStorage(storageKey));
  }

  obtenerDepartamentosPorSubRegiones(input: unknown, subRegiones: string[]): string[] {
    const subRegionesActivas = new Set(
      subRegiones.map((item) => this.normalizarTexto(item)).filter(Boolean)
    );

    return Array.from(
      new Set(
        this.normalizarSubRegiones(input)
          .filter((item) => !subRegionesActivas.size || subRegionesActivas.has(item.nombre))
          .flatMap((item) => item.departamentos.map((departamento) => departamento.nombre))
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  obtenerMunicipiosPorSubRegionesYDepartamentos(
    input: unknown,
    subRegiones: string[],
    departamentos: string[]
  ): string[] {
    const subRegionesActivas = new Set(
      subRegiones.map((item) => this.normalizarTexto(item)).filter(Boolean)
    );
    const departamentosActivos = new Set(
      departamentos.map((item) => this.normalizarTexto(item)).filter(Boolean)
    );

    return Array.from(
      new Set(
        this.normalizarSubRegiones(input)
          .filter((item) => !subRegionesActivas.size || subRegionesActivas.has(item.nombre))
          .flatMap((item) => item.departamentos)
          .filter((departamento) => !departamentosActivos.size || departamentosActivos.has(departamento.nombre))
          .flatMap((departamento) => departamento.municipios)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  normalizarRegistros(input: unknown): UnidadRegistroPlano[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => this.normalizarRegistro(item))
      .filter((item): item is UnidadRegistroPlano => item !== null);
  }

  construirJerarquia(input: unknown): AgrDivisionNodo[] {
    const registros = this.normalizarRegistros(input);
    const arbol = new Map<string, {
      agr_div: string;
      divisiones: Map<string, {
        division: string;
        brigadas: Map<string, {
          brigada: string;
          unidades: Map<string, {
            unidad: string;
            ubicaciones: Map<string, UnidadUbicacion>;
          }>;
        }>;
      }>;
    }>();

    for (const registro of registros) {
      if (!arbol.has(registro.agr_div)) {
        arbol.set(registro.agr_div, {
          agr_div: registro.agr_div,
          divisiones: new Map()
        });
      }

      const agrDivNodo = arbol.get(registro.agr_div)!;

      if (!agrDivNodo.divisiones.has(registro.division)) {
        agrDivNodo.divisiones.set(registro.division, {
          division: registro.division,
          brigadas: new Map()
        });
      }

      const divisionNodo = agrDivNodo.divisiones.get(registro.division)!;

      if (!divisionNodo.brigadas.has(registro.brigada)) {
        divisionNodo.brigadas.set(registro.brigada, {
          brigada: registro.brigada,
          unidades: new Map()
        });
      }

      const brigadaNodo = divisionNodo.brigadas.get(registro.brigada)!;

      if (!brigadaNodo.unidades.has(registro.unidad)) {
        brigadaNodo.unidades.set(registro.unidad, {
          unidad: registro.unidad,
          ubicaciones: new Map()
        });
      }

      const unidadNodo = brigadaNodo.unidades.get(registro.unidad)!;
      const claveUbicacion = `${registro.dpto}::${registro.mpio}`;

      if (!unidadNodo.ubicaciones.has(claveUbicacion)) {
        unidadNodo.ubicaciones.set(claveUbicacion, {
          dpto: registro.dpto,
          mpio: registro.mpio
        });
      }
    }

    return Array.from(arbol.values()).map((agrDivNodo) => ({
      agr_div: agrDivNodo.agr_div,
      divisiones: Array.from(agrDivNodo.divisiones.values()).map((divisionNodo) => ({
        division: divisionNodo.division,
        brigadas: Array.from(divisionNodo.brigadas.values()).map((brigadaNodo) => ({
          brigada: brigadaNodo.brigada,
          unidades: Array.from(brigadaNodo.unidades.values()).map((unidadNodo) => ({
            unidad: unidadNodo.unidad,
            ubicaciones: Array.from(unidadNodo.ubicaciones.values())
          }))
        }))
      }))
    }));
  }

  obtenerAgrupadores(input: unknown): string[] {
    return this.construirJerarquia(input).map((item) => item.agr_div);
  }

  obtenerDivisiones(input: unknown, agrDiv: string): string[] {
    const agrupador = this.construirJerarquia(input).find((item) => item.agr_div === agrDiv);
    return agrupador?.divisiones.map((item) => item.division) || [];
  }

  obtenerBrigadas(input: unknown, agrDiv: string, division: string): string[] {
    const divisionNodo = this.buscarDivision(this.construirJerarquia(input), agrDiv, division);
    return divisionNodo?.brigadas.map((item) => item.brigada) || [];
  }

  obtenerUnidades(input: unknown, agrDiv: string, division: string, brigada: string): string[] {
    const brigadaNodo = this.buscarBrigada(this.construirJerarquia(input), agrDiv, division, brigada);
    return brigadaNodo?.unidades.map((item) => item.unidad) || [];
  }

  obtenerUbicaciones(input: unknown, agrDiv: string, division: string, brigada: string, unidad: string): UnidadUbicacion[] {
    const unidadNodo = this.buscarUnidad(this.construirJerarquia(input), agrDiv, division, brigada, unidad);
    return unidadNodo?.ubicaciones || [];
  }

  private normalizarRegistro(item: unknown): UnidadRegistroPlano | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const registro = item as Record<string, unknown>;
    const agr_div = this.normalizarTexto(registro['agr_div']);
    const division = this.normalizarTexto(registro['division']);
    const brigada = this.normalizarTexto(registro['brigada']);
    const unidad = this.normalizarTexto(registro['unidad']);
    const dpto = this.normalizarTexto(registro['dpto']);
    const mpio = this.normalizarTexto(registro['mpio']);

    if (!agr_div || !division || !brigada || !unidad || !dpto || !mpio) {
      return null;
    }

    return { agr_div, division, brigada, unidad, dpto, mpio };
  }

  private normalizarRegistroSubRegion(item: unknown): SubRegionRegistro | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const registro = item as Record<string, unknown>;
    const nombre = this.normalizarTexto(registro['nombre']);
    const departamentosRaw = Array.isArray(registro['departamentos']) ? registro['departamentos'] : [];

    if (!nombre) {
      return null;
    }

    const departamentos = departamentosRaw
      .map((departamento) => this.normalizarDepartamentoSubRegion(departamento))
      .filter((departamento): departamento is SubRegionDepartamento => departamento !== null);

    return {
      id: typeof registro['id'] === 'number' ? registro['id'] : undefined,
      nombre,
      departamentos
    };
  }

  private normalizarDepartamentoSubRegion(item: unknown): SubRegionDepartamento | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const registro = item as Record<string, unknown>;
    const nombre = this.normalizarTexto(registro['nombre']);
    const municipiosRaw = Array.isArray(registro['municipios']) ? registro['municipios'] : [];

    if (!nombre) {
      return null;
    }

    const municipios = Array.from(
      new Set(
        municipiosRaw
          .map((municipio) => this.normalizarTexto(municipio))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return { nombre, municipios };
  }

  private normalizarRegistroEnemigo(item: unknown): EnemigoRegistroPlano | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const registro = item as Record<string, unknown>;
    const enemigo = this.normalizarTexto(
      registro['enemigo'] ??
      registro['nombre'] ??
      registro['valor'] ??
      registro['descripcion']
    );

    if (!enemigo) {
      return null;
    }

    const ene_estructura = this.normalizarTexto(
      registro['ene_estructura'] ??
      registro['enemigo_estructura'] ??
      registro['enemigoEstructura'] ??
      registro['estructura']
    );

    return ene_estructura
      ? { enemigo, ene_estructura }
      : { enemigo };
  }

  private normalizarCatalogo<K extends string, T extends Record<K, string>>(input: unknown, fieldName: K): T[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => this.normalizarRegistroCatalogo<K, T>(item, fieldName))
      .filter((item): item is T => item !== null);
  }

  private normalizarCatalogoConAliases<K extends string, T extends Record<K, string>>(
    input: unknown,
    targetField: K,
    aliases: string[]
  ): T[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => this.normalizarRegistroCatalogoConAliases<K, T>(item, targetField, aliases))
      .filter((item): item is T => item !== null);
  }

  private obtenerCatalogoDesdeStorage<K extends string, T extends Record<K, string>>(storageKey: string, fieldName: K): T[] {
    const raw = localStorage.getItem(storageKey);

    try {
      const items = raw ? JSON.parse(raw) : [];
      return this.normalizarCatalogo<K, T>(items, fieldName);
    } catch {
      return [];
    }
  }

  private obtenerCatalogoDesdeStorageConAliases<K extends string, T extends Record<K, string>>(
    storageKey: string,
    fieldName: K,
    aliases: string[]
  ): T[] {
    const raw = localStorage.getItem(storageKey);

    try {
      const items = raw ? JSON.parse(raw) : [];
      return this.normalizarCatalogoConAliases<K, T>(items, fieldName, aliases);
    } catch {
      return [];
    }
  }

  private obtenerNombresCatalogo<K extends string, T extends Record<K, string>>(input: unknown, fieldName: K): string[] {
    return Array.from(
      new Set(this.normalizarCatalogo<K, T>(input, fieldName).map((item) => item[fieldName]))
    ).sort((a, b) => a.localeCompare(b));
  }

  private obtenerNombresCatalogoConAliases<K extends string, T extends Record<K, string>>(
    input: unknown,
    fieldName: K,
    aliases: string[]
  ): string[] {
    return Array.from(
      new Set(this.normalizarCatalogoConAliases<K, T>(input, fieldName, aliases).map((item) => item[fieldName]))
    ).sort((a, b) => a.localeCompare(b));
  }

  private normalizarRegistroCatalogo<K extends string, T extends Record<K, string>>(item: unknown, fieldName: K): T | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const registro = item as Record<string, unknown>;
    const value = this.normalizarTexto(registro[fieldName]);

    if (!value) {
      return null;
    }

    return { [fieldName]: value } as T;
  }

  private normalizarRegistroCatalogoConAliases<K extends string, T extends Record<K, string>>(
    item: unknown,
    targetField: K,
    aliases: string[]
  ): T | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const registro = item as Record<string, unknown>;

    for (const alias of aliases) {
      const value = this.normalizarTexto(registro[alias]);
      if (value) {
        return { [targetField]: value } as T;
      }
    }

    return null;
  }

  private normalizarTexto(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private buscarDivision(arbol: AgrDivisionNodo[], agrDiv: string, division: string): DivisionNodo | undefined {
    return arbol
      .find((item) => item.agr_div === agrDiv)
      ?.divisiones.find((item) => item.division === division);
  }

  private buscarBrigada(arbol: AgrDivisionNodo[], agrDiv: string, division: string, brigada: string): BrigadaNodo | undefined {
    return this.buscarDivision(arbol, agrDiv, division)
      ?.brigadas.find((item) => item.brigada === brigada);
  }

  private buscarUnidad(arbol: AgrDivisionNodo[], agrDiv: string, division: string, brigada: string, unidad: string): UnidadNodo | undefined {
    return this.buscarBrigada(arbol, agrDiv, division, brigada)
      ?.unidades.find((item) => item.unidad === unidad);
  }
}
