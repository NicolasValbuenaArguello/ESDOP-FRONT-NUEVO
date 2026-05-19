import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';
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

export interface SidebarLayoutChange {
  visible: boolean;
  compacto: boolean;
  width: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() ocultar = new EventEmitter<void>();
  @Output() layoutChange = new EventEmitter<SidebarLayoutChange>();
  @ViewChild('sidebarRoot') sidebarRoot?: ElementRef<HTMLElement>;

  readonly usuario: string;
  readonly unidad: string;

  inicio: MenuPage | null = null;
  grupos: MenuGroup[] = [];

  urlActual = '';
  menuAbierto = 'Usuarios';
  compacto = false;

  private routerEvents?: Subscription;
  private resizeObserver?: ResizeObserver;

  constructor(private auth: AuthService, private router: Router) {
    this.usuario = this.auth.obtenerUsuario() || 'Usuario';
    this.unidad = this.auth.obtenerUnidad() || 'Unidad no registrada';
    this.cargarGruposDesdePermisos();
  }

  cargarGruposDesdePermisos() {
    // Sidebar:
    // este metodo transforma el arreglo de permisos persistido en localStorage
    // a la estructura visual del menu. Solo aparecen paginas que
    // `AuthService.tienePermisoPagina()` considere accesibles.
    const permisos = this.auth.obtenerPermisos();
    const homePerm = permisos.find((p) => p.menu?.toUpperCase() === 'HOME' && this.auth.tienePermisoPagina(p));
    this.inicio = homePerm ? {
      nombre: homePerm.nombre,
      ruta: homePerm.ruta,
      descripcion: homePerm.nombre,
      icono: 'home'
    } : null;

    const gruposMap: { [menu: string]: MenuGroup } = {};
    for (const permiso of permisos) {
      if (!this.auth.tienePermisoPagina(permiso)) continue;
      if (permiso.menu?.toUpperCase() === 'HOME') continue;
      if (!gruposMap[permiso.menu]) {
        gruposMap[permiso.menu] = {
          menu: permiso.menu,
          icono: this.obtenerIconoMenu(permiso.menu),
          paginas: []
        };
      }
      gruposMap[permiso.menu].paginas.push({
        nombre: permiso.nombre,
        ruta: permiso.ruta,
        descripcion: permiso.nombre,
        icono: this.obtenerIconoMenu(permiso.menu)
      });
    }
    this.grupos = Object.values(gruposMap);
  }

  obtenerIconoMenu(menu: string): 'users' | 'chart' | 'settings' {
    if (menu.toLowerCase().includes('usuario')) return 'users';
    if (menu.toLowerCase().includes('estad')) return 'chart';
    if (menu.toLowerCase().includes('seguimiento')) return 'chart';
    if (menu.toLowerCase().includes('config')) return 'settings';
    return 'settings';
  }

  ngOnInit() {
    this.refrescarPermisosSidebar();
    this.actualizarMenuActivo(this.router.url);
    this.routerEvents = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.actualizarMenuActivo(event.urlAfterRedirects));
  }

  ngAfterViewInit() {
    this.emitirLayout(true);
    this.observarTamanoSidebar();
  }

  ngOnDestroy() {
    this.routerEvents?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  estaAbierto(menu: string) {
    return this.menuAbierto === menu;
  }

  toggleMenu(menu: string) {
    this.menuAbierto = this.estaAbierto(menu) ? '' : menu;
    this.compacto = false;
    this.emitirLayout();
  }

  toggleCompacto() {
    this.compacto = !this.compacto;
    this.emitirLayout();
  }

  grupoTieneRutaActiva(grupo: MenuGroup) {
    return grupo.paginas.some((pagina) => this.estaRutaActiva(pagina.ruta));
  }

  ocultarSidebar() {
    this.layoutChange.emit({
      visible: false,
      compacto: this.compacto,
      width: 0
    });
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
    return this.grupos.length + (this.inicio ? 1 : 0);
  }

  get grupoActivo() {
    return this.grupos.find((grupo) => grupo.menu === this.menuAbierto) || this.grupos[0];
  }

  estaRutaActiva(ruta: string) {
    return this.urlActual === ruta || this.urlActual.startsWith(`${ruta}/`);
  }

  private actualizarMenuActivo(url: string) {
    this.urlActual = url;

    if (this.inicio && this.inicio.ruta && (url === this.inicio.ruta || url.startsWith(`${this.inicio.ruta}/`))) {
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

  private refrescarPermisosSidebar() {
    const usuario = this.auth.obtenerUsuario();

    if (!usuario || !this.auth.estaAutenticado()) {
      return;
    }

    this.auth.cargarPermisosDesdeFrontend(usuario)
      .pipe(take(1))
      .subscribe({
        next: (permisos) => {
          if (!permisos.length) {
            return;
          }

          this.auth.guardarPermisos(permisos);
          this.cargarGruposDesdePermisos();
          this.actualizarMenuActivo(this.router.url);
          this.emitirLayout();
        },
        error: () => {
          // Si el backend no responde, mantenemos los permisos locales
          // para no interrumpir la navegación actual.
        }
      });
  }

  private observarTamanoSidebar() {
    const host = this.sidebarRoot?.nativeElement;

    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.emitirLayout());
    this.resizeObserver.observe(host);
  }

  private emitirLayout(force = false) {
    const width = this.sidebarRoot?.nativeElement.getBoundingClientRect().width || 0;

    if (!force && !width) {
      return;
    }

    this.layoutChange.emit({
      visible: true,
      compacto: this.compacto,
      width
    });
  }
}
