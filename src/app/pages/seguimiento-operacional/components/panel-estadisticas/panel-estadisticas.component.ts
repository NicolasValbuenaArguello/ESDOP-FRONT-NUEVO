import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoTablaRow } from '../../interfaces/seguimiento-operacional.interface';

/**
 * Tabla tecnica para lectura rapida de registros.
 * Se mantiene independiente para evolucionar a virtualizacion o paginacion.
 */
@Component({
  selector: 'app-panel-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-estadisticas.component.html',
  styleUrls: ['./panel-estadisticas.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelEstadisticasComponent {
  @Input() tabla: SeguimientoTablaRow[] = [];

  trackByRow(_: number, item: SeguimientoTablaRow) {
    return item.id;
  }
}
