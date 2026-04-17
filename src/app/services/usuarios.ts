import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8001/usuarios';

export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  email: string;
  unidad: string;
  nivel_per_uni?: string;
  unida_per?: string;
}

export interface UsuarioListado {
  id: number;
  nombre: string;
  usuario: string;
  email: string;
  unidad: string;
  nivel_per_uni?: string;
  unida_per?: string;
}

export interface UsuarioCreate {
  nombre: string;
  usuario: string;
  password: string;
  email: string;
  unidad: string;
  nivel_per_uni?: string;
  unida_per?: string;
}

export interface UsuarioUpdate {
  nombre?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioListado[]> {
    return this.http.get<UsuarioListado[]>('http://localhost:8001/usuarios');
  }

  obtenerUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${API_URL}/${id}`);
  }

  crearUsuario(data: UsuarioCreate): Observable<Usuario> {
    return this.http.post<Usuario>(API_URL, data);
  }

  actualizarUsuario(id: number, data: UsuarioUpdate): Observable<any> {
    return this.http.put(`${API_URL}/${id}`, data);
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/${id}`);
  }
}