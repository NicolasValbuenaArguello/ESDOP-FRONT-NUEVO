import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Home', descripcion: 'Panel principal' }
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios/usuarios').then((m) => m.UsuariosComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Usuarios', descripcion: 'Gestion de usuarios' }
  },
  {
    path: 'usuarios/nuevos',
    loadComponent: () => import('./pages/usuarios/usuarios/usuarios').then((m) => m.UsuariosComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Usuarios Ingreso', descripcion: 'Creacion de usuarios' }
  },
  {
    path: 'usuarios/listado',
    loadComponent: () => import('./pages/usuarios/usuarios/usuarios').then((m) => m.UsuariosComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Usuarios Listados', descripcion: 'Listado de usuarios' }
  },
  {
    path: 'afectaciones',
    loadComponent: () => import('./pages/afectaciones/afectaciones').then((m) => m.AfectacionesComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Afectaciones', descripcion: 'Visualización de afectaciones' }
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/estadisticas/estadisticas.component').then((m) => m.EstadisticasComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Estadisticas', descripcion: 'Visualizacion de estadisticas' }
  },
 {
  path: 'seguimiento',
  loadComponent: () => import('./pages/seguimiento-operacional/seguimiento-operacional').then((m) => m.SeguimientoOperacional),
  canActivate: [AuthGuard],
  data: { nombre: 'Seguimiento Operacional', descripcion: 'Panel de seguimiento operacional' }
 },
  {
    path: 'configuracion',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Configuracion', descripcion: 'Ajustes del sistema' }
  },
  { path: '**', redirectTo: 'login' }
];
