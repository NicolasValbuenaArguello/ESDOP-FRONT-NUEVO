import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PermisoPagina {
  ver?: boolean;
  crear?: boolean;
  editar?: boolean;
  eliminar?: boolean;
  tiene_permiso?: boolean;
  puede_ver?: boolean;
  puede_crear?: boolean;
  puede_editar?: boolean;
  puede_eliminar?: boolean;
}

export interface Usuario {
  id?: number;
  nombre: string;
  usuario: string;
  password?: string;
  email: string;
  unidad: string;
  nivel_per_uni: string;
  unida_per: string;
  grado_id?: number;
  roles: string[];
  permisos?: {
    [pagina: string]: PermisoPagina;
  };
}

export interface UsuarioCreatePayload {
  nombre: string;
  usuario: string;
  password: string;
  email: string;
  unidad: string;
  nivel_per_uni: string;
  unida_per: string;
  roles: string[];
  permisos: {
    [pagina: string]: {
      puede_ver: boolean;
      puede_crear: boolean;
      puede_editar: boolean;
      puede_eliminar: boolean;
    };
  };
}

export interface UsuarioUpdatePayload {
  nombre?: string;
  email?: string;
  unidad?: string;
  nivel_per_uni?: string;
  unida_per?: string;
  roles?: string[];
  permisos?: {
    [pagina: string]: {
      puede_ver: boolean;
      puede_crear: boolean;
      puede_editar: boolean;
      puede_eliminar: boolean;
    };
  };
}

export interface Grado {
  id: number;
  nombre: string;
  abreviatura: string;
  nivel: number;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Pagina {
  id: number;
  menu: string;
  nombre: string;
  ruta: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {

  private api = `${environment.apiUrl_2}`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.api}/usuarios`);
  }

  create(data: UsuarioCreatePayload) {
    return this.http.post(`${this.api}/usuarios`, data);
  }

  update(id: number, data: UsuarioUpdatePayload) {
    return this.http.put(`${this.api}/usuarios/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/usuarios/${id}`);
  }

  getGrados(): Observable<Grado[]> {
    return this.http.get<Grado[]>(`${this.api}/grados`);
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.api}/roles`);
  }

  getPaginas(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(`${this.api}/paginas`);
  }
}