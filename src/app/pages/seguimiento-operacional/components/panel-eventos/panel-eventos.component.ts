import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoTimelineItem } from '../../interfaces/seguimiento-operacional.interface';

/**
 * Timeline tecnico de eventos.
 * Mantiene la secuencia compacta y desacoplada del resto del panel.
 */
@Component({
  selector: 'app-panel-eventos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-eventos.component.html',
  styleUrls: ['./panel-eventos.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelEventosComponent {
  @Input() timeline: SeguimientoTimelineItem[] = [];

  trackByTimeline(_: number, item: SeguimientoTimelineItem) {
    return item.id;
  }
}
