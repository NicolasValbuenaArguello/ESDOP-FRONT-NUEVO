import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './guards/auth-guard';
import { HomeComponent } from './home/home.component';
import { EstadisticasComponent } from './pages/estadisticas/estadisticas.component';
import { UsuariosComponent } from './pages/usuarios/usuarios/usuarios';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard],
    data: { nombre: 'Home', descripcion: 'Panel principal' }
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [AuthGuard],
    data: { nombre: 'Usuarios', descripcion: 'Gestión de usuarios' }
  },
  {
    path: 'estadisticas',
    component: EstadisticasComponent,
    canActivate: [AuthGuard],
    data: { nombre: 'Estadisticas', descripcion: 'Visualizacion de estadisticas' }
  },
  {
    path: 'configuracion',
    component: HomeComponent,
    canActivate: [AuthGuard],
    data: { nombre: 'Configuracion', descripcion: 'Ajustes del sistema' }
  },
  { path: '**', redirectTo: 'login' }
];
