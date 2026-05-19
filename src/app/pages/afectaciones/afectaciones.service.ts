import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AfectacionListFilters,
  AfectacionListResponse,
  AfectacionResponse
} from './afectaciones.models';

@Injectable({ providedIn: 'root' })
export class AfectacionesService {
  private readonly api = `${environment.apiBase}${environment.services?.afectaciones ?? '/afectaciones'}`;

  constructor(private readonly http: HttpClient) {}

  crearAfectacion(formData: FormData): Observable<AfectacionResponse> {
    return this.http
      .post<AfectacionResponse>(`${this.api}/cargue_afectaciones_personal`, formData)
      .pipe(timeout(30000));
  }

  listarAfectaciones(filters?: AfectacionListFilters): Observable<AfectacionListResponse> {
    const formData = new FormData();

    if (filters?.fecha_inicial) {
      formData.append('fecha_inicial', filters.fecha_inicial);
    }

    if (filters?.fecha_final) {
      formData.append('fecha_final', filters.fecha_final);
    }

    if (filters?.division) {
      formData.append('division', filters.division);
    }

    return this.http
      .post<AfectacionListResponse>(`${this.api}/listar`, formData)
      .pipe(timeout(30000));
  }

  actualizarAfectacion(id: number, formData: FormData): Observable<AfectacionResponse> {
    return this.http.put<AfectacionResponse>(`${this.api}/${id}`, formData).pipe(timeout(30000));
  }

  eliminarAfectacion(id: number): Observable<AfectacionResponse> {
    return this.http.delete<AfectacionResponse>(`${this.api}/${id}`).pipe(timeout(30000));
  }
}
