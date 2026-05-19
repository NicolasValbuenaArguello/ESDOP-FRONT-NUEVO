import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoAlerta } from '../../interfaces/seguimiento-operacional.interface';

/**
 * Lista reutilizable de alertas operacionales.
 * Se mantiene independiente para facilitar su evolucion a virtual scroll,
 * sockets o estrategias de carga parcial sin tocar el panel principal.
 */
@Component({
  selector: 'app-panel-alertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-alertas.component.html',
  styleUrls: ['./panel-alertas.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelAlertasComponent {
  @Input() titulo = 'Alertas';
  @Input() subtitulo = '';
  @Input() alertas: SeguimientoAlerta[] = [];

  trackByAlert(_: number, item: SeguimientoAlerta) {
    return item.id;
  }
}
