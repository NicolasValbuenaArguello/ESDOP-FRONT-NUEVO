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
    data: { nombre: 'Usuarios', descripcion: 'Gestión de usuarios' }
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/estadisticas/estadisticas.component').then((m) => m.EstadisticasComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Estadisticas', descripcion: 'Visualizacion de estadisticas' }
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [AuthGuard],
    data: { nombre: 'Configuracion', descripcion: 'Ajustes del sistema' }
  },
  { path: '**', redirectTo: 'login' }
];
