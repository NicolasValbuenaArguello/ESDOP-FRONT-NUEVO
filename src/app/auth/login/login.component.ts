import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  // Método reutilizable para mostrar cualquier novedad/error en el modal
  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,

  ) { }
  mostrarCaptcha = false;
  captchaToken: string | null = null;

  mostrarNovedad(mensaje: string) {
    this.mostrarReservaLegal = false;

    this.error = mensaje;
    this.mostrarErrorModal = true;

    // 🔥 FORZAR DETECCIÓN DE CAMBIOS
    this.cdr.detectChanges();

    setTimeout(() => {
      this.cerrarErrorModal();
    }, 3000);
  }
  cerrarErrorModal() {
    this.mostrarErrorModal = false;
    this.error = '';
  }
  usuario = '';
  password = '';
  verPassword = false;
  cargando = false;
  error = '';
  errorAutoFocus = false;
  mostrarErrorModal = false;
  mostrarReservaLegal = false;
  ngOnInit() {
    this.mostrarReservaLegal = true;
  }

  readonly puntosInteres = [
    {
      titulo: 'Operacion con trazabilidad',
      descripcion: 'Consulta indicadores, reportes y estados operativos desde un unico punto institucional.'
    },
    {
      titulo: 'Seguridad de acceso',
      descripcion: 'El ingreso esta dirigido a personal autorizado y queda sujeto a controles internos y trazabilidad.'
    },
    {
      titulo: 'Gestion oportuna',
      descripcion: 'Centraliza informacion clave para seguimiento, coordinacion y toma de decisiones.'
    }
  ];

  readonly fundamentosLegales = [
    'Ley 1581 de 2012: reglas generales para la proteccion de datos personales.',
    'Ley 1712 de 2014: acceso a la informacion publica y limites de reserva legal.',
    'Ley 1273 de 2009: proteccion penal de la informacion y de los sistemas informaticos.'
  ];



  togglePassword() {
    this.verPassword = !this.verPassword;
  }

  cerrarReservaLegal() {
    this.mostrarReservaLegal = false;
  }

  login() {
    if (this.cargando) return; // evita dobles ejecuciones

    if (!this.usuario.trim() || !this.password.trim()) {
      this.mostrarNovedad('Ingresa usuario y contrasena.');
      return;
    }
    if (this.mostrarCaptcha && !this.captchaToken) {
      this.mostrarNovedad('Completa el captcha');
      return;
    }
    this.cargando = true;
    this.error = '';
    this.errorAutoFocus = false;

    this.auth.login(this.usuario, this.password, this.captchaToken).subscribe({
      next: (res) => {
        this.auth.guardarToken(res.access_token);
        this.auth.guardarPerfilUsuario(this.auth.resolverUsuarioLogin(res), this.usuario);

        if (!this.auth.resolverUsuarioLogin(res)) {
          this.auth.guardarUsuarioDesdeToken(res.access_token, this.usuario);
        }

        if (this.auth.respuestaIncluyePermisos(res)) {
          const permisos = this.auth.resolverPermisosLogin(res);
          this.auth.guardarPermisos(permisos);
          this.navegarARutaInicial();
          return;
        }

        this.auth.cargarPermisosDesdeFrontend(this.usuario).subscribe({
          next: (permisos) => {
            this.auth.guardarPermisos(
              permisos.length
                ? permisos
                : this.auth.resolverPermisosLogin(res)
            );
            this.navegarARutaInicial();
          },
          error: () => {
            this.auth.guardarPermisos(this.auth.resolverPermisosLogin(res));
            this.navegarARutaInicial();
          }
        });
      },
      error: (err) => {
        this.cargando = false;

        const mensaje = err?.error?.detail || 'Credenciales incorrectas';

        this.mostrarNovedad(mensaje);

        // 🔥 activar captcha si backend lo pide
        if (mensaje === 'Captcha requerido') {
          this.mostrarCaptcha = true;
        }

        if (mensaje === 'Captcha inválido') {
          this.mostrarCaptcha = true;
        }
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  private navegarARutaInicial() {
    const rutaInicial = this.auth.obtenerPrimeraRutaPermitida();
    this.router.navigateByUrl(rutaInicial).catch(() => {
      this.router.navigate(['/login']);
    });
  }
}
