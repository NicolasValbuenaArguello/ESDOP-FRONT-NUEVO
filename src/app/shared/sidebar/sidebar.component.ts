import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth';

interface MenuPage {
  nombre: string;
  ruta: string;
  descripcion: string;
}

interface MenuGroup {
  menu: string;
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

  readonly grupos: MenuGroup[] = [
    {
      menu: 'HOME',
      paginas: [
        { nombre: 'Home', ruta: '/home', descripcion: 'Panel principal' }
      ]
    },
    {
      menu: 'Usuarios',
      paginas: [
        { nombre: 'Gestión de usuarios', ruta: '/usuarios', descripcion: 'Alta, edición y permisos de usuarios' }
      ]
    },
    {
      menu: 'Estadistica',
      paginas: [
        { nombre: 'Estadisticas', ruta: '/estadisticas', descripcion: 'Visualizacion de estadisticas' }
      ]
    },
    {
      menu: 'Configuracion',
      paginas: [
        { nombre: 'Configuracion', ruta: '/configuracion', descripcion: 'Ajustes del sistema' }
      ]
    }
  ];

  menuAbierto = 'HOME';
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
  }

  ocultarSidebar() {
    this.ocultar.emit();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private actualizarMenuActivo(url: string) {
    // Si la ruta contiene '/usuarios', abrir el menú de usuarios
    if (url.includes('/usuarios')) {
      this.menuAbierto = 'Usuarios';
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
