import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Guard de rutas:
    // - valida autenticacion por token
    // - valida acceso a pagina usando los permisos ya resueltos por AuthService
    // - los permisos CRUD NO se controlan aqui; esos se aplican dentro de cada componente
    if (!this.auth.estaAutenticado()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (this.auth.obtenerPermisos().length === 0) {
      return true;
    }

    if (state.url === '/login') {
      return true;
    }

    if (this.auth.tieneAccesoRuta(state.url)) {
      return true;
    }

    const rutaFallback = this.auth.obtenerPrimeraRutaPermitida();
    this.router.navigateByUrl(rutaFallback);
    return false;
  }
}
