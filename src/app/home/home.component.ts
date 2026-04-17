import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  readonly page$;
  sidebarVisible = true;

  readonly resumen = [
    { etiqueta: 'Usuarios activos', valor: '128', detalle: 'Registros habilitados' },
    { etiqueta: 'Operaciones', valor: '42', detalle: 'Procesos en seguimiento' },
    { etiqueta: 'Alertas', valor: '7', detalle: 'Pendientes por validar' }
  ];

  constructor(route: ActivatedRoute) {
    this.page$ = route.data;
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }
}
