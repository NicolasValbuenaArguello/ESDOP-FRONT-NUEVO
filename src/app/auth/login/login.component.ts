import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  usuario = '';
  password = '';
  verPassword = false;
  cargando = false;
  error = '';
  mostrarReservaLegal = true;

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

  constructor(private auth: AuthService, private router: Router) {}

  togglePassword() {
    this.verPassword = !this.verPassword;
  }

  cerrarReservaLegal() {
    this.mostrarReservaLegal = false;
  }

  login() {
    if (!this.usuario.trim() || !this.password.trim()) {
      this.error = 'Ingresa usuario y contrasena.';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.auth.login(this.usuario, this.password).subscribe({
      next: (res) => {
        this.auth.guardarToken(res.access_token);
        this.auth.guardarUsuarioDesdeToken(res.access_token, this.usuario);
        this.router.navigate(['/home']).catch(() => {
          this.router.navigate(['/login']);
        });
      },
      error: () => {
        this.cargando = false;
        this.error = 'Credenciales incorrectas. Verifica tus datos.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }
}
