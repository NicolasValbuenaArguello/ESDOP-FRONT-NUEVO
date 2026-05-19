import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelAlertasComponent } from '../panel-alertas/panel-alertas.component';
import {
  SeguimientoSubmenu,
  SeguimientoTablaRow,
  SeguimientoTimelineItem
} from '../../interfaces/seguimiento-operacional.interface';

/**
 * Panel lateral de informacion viva.
 * Reune tabla operativa, capacidades y linea de tiempo en un contenedor
 * con scroll independiente, listo para sumar graficas y widgets futuros.
 */
@Component({
  selector: 'app-panel-info',
  standalone: true,
  imports: [CommonModule, PanelAlertasComponent],
  templateUrl: './panel-info.component.html',
  styleUrls: ['./panel-info.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelInfoComponent {
  @Input() seccion: SeguimientoSubmenu | null = null;

  trackByRow(_: number, item: SeguimientoTablaRow) {
    return item.id;
  }

  trackByTimeline(_: number, item: SeguimientoTimelineItem) {
    return item.id;
  }

  trackByCapacidad(_: number, item: string) {
    return item;
  }
}
