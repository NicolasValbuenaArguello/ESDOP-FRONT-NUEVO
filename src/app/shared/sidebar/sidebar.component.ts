import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth';

interface MenuPage {
  nombre: string;
  ruta: string;
  descripcion: string;
  icono: 'home' | 'users' | 'chart' | 'settings';
}

interface MenuGroup {
  menu: string;
  icono: 'users' | 'chart' | 'settings';
  paginas: MenuPage[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() ocultar = new EventEmitter<void>();

  readonly usuario: string;
  readonly unidad: string;

  readonly inicio: MenuPage = {
    nombre: 'Inicio',
    ruta: '/home',
    descripcion: 'Resumen general del sistema',
    icono: 'home'
  };

  readonly grupos: MenuGroup[] = [
    {
      menu: 'Usuarios',
      icono: 'users',
      paginas: [
        { nombre: 'Gestión de usuarios', ruta: '/usuarios', descripcion: 'Altas, edición y permisos de usuarios', icono: 'users' }
      ]
    },
    {
      menu: 'Estadísticas',
      icono: 'chart',
      paginas: [
        { nombre: 'Estadísticas', ruta: '/estadisticas', descripcion: 'Visualización de estadísticas', icono: 'chart' }
      ]
    },
    {
      menu: 'Configuración',
      icono: 'settings',
      paginas: [
        { nombre: 'Configuración', ruta: '/configuracion', descripcion: 'Ajustes generales del sistema', icono: 'settings' }
      ]
    }
  ];

  urlActual = '';
  menuAbierto = 'Usuarios';
  compacto = false;
  private routerEvents?: Subscription;

  constructor(private auth: AuthService, private router: Router) {
    this.usuario = this.auth.obtenerUsuario() || 'Usuario';
    this.unidad = this.auth.obtenerUnidad() || 'Unidad no registrada';
  }

  ngOnInit() {
    this.actualizarMenuActivo(this.router.url);
    this.routerEvents = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.actualizarMenuActivo(event.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.routerEvents?.unsubscribe();
  }

  estaAbierto(menu: string) {
    return this.menuAbierto === menu;
  }

  toggleMenu(menu: string) {
    this.menuAbierto = this.estaAbierto(menu) ? '' : menu;
    this.compacto = false;
  }

  toggleCompacto() {
    this.compacto = !this.compacto;
  }

  grupoTieneRutaActiva(grupo: MenuGroup) {
    return grupo.paginas.some((pagina) => this.estaRutaActiva(pagina.ruta));
  }

  ocultarSidebar() {
    this.ocultar.emit();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  obtenerIniciales(texto: string) {
    return texto
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((palabra) => palabra[0]?.toUpperCase() || '')
      .join('');
  }

  get accesosTotales() {
    return this.grupos.length + 1;
  }

  get grupoActivo() {
    return this.grupos.find((grupo) => grupo.menu === this.menuAbierto) || this.grupos[0];
  }

  estaRutaActiva(ruta: string) {
    return this.urlActual === ruta || this.urlActual.startsWith(`${ruta}/`);
  }

  private actualizarMenuActivo(url: string) {
    this.urlActual = url;

    if (url === this.inicio.ruta || url.startsWith(`${this.inicio.ruta}/`)) {
      this.menuAbierto = '';
      return;
    }

    const grupoActivo = this.grupos.find((grupo) =>
      grupo.paginas.some((pagina) => url === pagina.ruta || url.startsWith(`${pagina.ruta}/`))
    );
    if (grupoActivo) {
      this.menuAbierto = grupoActivo.menu;
    }
  }
}
