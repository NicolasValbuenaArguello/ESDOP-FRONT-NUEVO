import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) {}

  login(usuario: string, password: string) {
  return this.http.post<any>(`${environment.apiUrl}/login`, {
      username: usuario,
      password: password
    });
  }

  guardarToken(token: string) {
    localStorage.setItem('token', token);
  }

  guardarUsuario(usuario: string) {
    localStorage.setItem('usuario', usuario);
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

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('unidad');
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
