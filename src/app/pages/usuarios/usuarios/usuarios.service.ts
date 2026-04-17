import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Usuario {
  id?: number;
  nombre: string;
  usuario: string;
  password?: string;
  email: string;
  unidad: string;
  nivel_per_uni: string;
  unida_per: string;
  roles: string[];
  grado_id?: number;
  permisos?: {
    [pagina: string]: {
      ver?: boolean;
      crear?: boolean;
      editar?: boolean;
      eliminar?: boolean;
    }
  };
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {

  private api = `${environment.apiUrl_2}`;

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.api}/usuarios`, this.headers());
  }

  create(data: Usuario) {
    return this.http.post(`${this.api}/usuarios`, data, this.headers());
  }

  update(data: Usuario) {
    return this.http.put(`${this.api}/usuarios/${data.id}`, data, this.headers());
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/usuarios/${id}`, this.headers());
  }
}