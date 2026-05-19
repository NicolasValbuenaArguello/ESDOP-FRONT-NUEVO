import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should identify privileged users by roles', () => {
    localStorage.setItem('roles', JSON.stringify(['ADMIN']));

    expect(service.esUsuarioPrivilegiado()).toBeTrue();
  });

  it('should expose all registered pages for privileged users', () => {
    localStorage.setItem('roles', JSON.stringify(['SUPER']));

    service.guardarPermisos([
      {
        menu: 'HOME',
        nombre: 'Home',
        ruta: '/home',
        tiene_permiso: true,
        puede_ver: true
      }
    ]);

    const permisos = service.obtenerPermisos();
    const seguimiento = permisos.find((permiso) => permiso.ruta === '/seguimiento');

    expect(seguimiento).toBeTruthy();
    expect(seguimiento?.menu).toBe('Seguimiento Operacional');
    expect(seguimiento?.nombre).toBe('Seguimiento');
    expect(seguimiento?.puede_ver).toBeTrue();
  });
});
