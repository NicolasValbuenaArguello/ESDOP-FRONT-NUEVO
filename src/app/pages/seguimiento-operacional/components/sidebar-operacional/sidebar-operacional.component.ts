import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SeguimientoMapState,
  SeguimientoMenu,
  SeguimientoSeccionVisible,
  SeguimientoSubmenu
} from '../../interfaces/seguimiento-operacional.interface';

/**
 * Sidebar interno del modulo operacional.
 * Controla seccion activa, visibilidad de modulos y estado del mapa
 * sin depender de botones dispersos en el contenido principal.
 */
@Component({
  selector: 'app-sidebar-operacional',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-operacional.component.html',
  styleUrls: ['./sidebar-operacional.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarOperacionalComponent {
  @Input({ required: true }) menu: SeguimientoMenu[] = [];
  @Input({ required: true }) seccionActiva = '';
  @Input() modulos: SeguimientoSeccionVisible[] = [];
  @Input() mapState: SeguimientoMapState = {
    visible: false,
    expandido: false,
    fullscreen: false,
    modoTactico: false
  };
  @Input() filtrosActivos: string[] = [];

  @Output() toggleMenu = new EventEmitter<SeguimientoMenu>();
  @Output() submenuSeleccionado = new EventEmitter<{
    menu: SeguimientoMenu;
    submenu: SeguimientoSubmenu;
  }>();
  @Output() alternarModulo = new EventEmitter<string>();
  @Output() alternarMapa = new EventEmitter<void>();
  @Output() alternarMapaExpandido = new EventEmitter<void>();
  @Output() alternarMapaFullscreen = new EventEmitter<void>();
  @Output() alternarModoTactico = new EventEmitter<void>();

  esSubmenuActivo(submenuId: string) {
    return this.seccionActiva === submenuId;
  }

  trackByMenu(_: number, item: SeguimientoMenu) {
    return item.nombre;
  }

  trackBySubmenu(_: number, item: SeguimientoSubmenu) {
    return item.id;
  }

  trackByModulo(_: number, item: SeguimientoSeccionVisible) {
    return item.clave;
  }

  trackByFiltro(_: number, item: string) {
    return item;
  }
}
