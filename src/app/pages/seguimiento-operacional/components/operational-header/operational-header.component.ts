import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Franja superior del centro de mando.
 * Resume contexto operacional y concentra acciones primarias de layout.
 */
@Component({
  selector: 'app-operational-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './operational-header.component.html',
  styleUrls: ['./operational-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationalHeaderComponent {
  @Input() titulo = 'Seguimiento Operacional';
  @Input() subtitulo = '';
  @Input() estadoSidebar = 'Sidebar extendido';
  @Input() resumen: string[] = [];

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() abrirFiltros = new EventEmitter<void>();
}
