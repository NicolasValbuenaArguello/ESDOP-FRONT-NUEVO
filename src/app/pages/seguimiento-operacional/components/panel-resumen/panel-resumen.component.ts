import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoSubmenu } from '../../interfaces/seguimiento-operacional.interface';

/**
 * Resumen tecnico de la seccion activa.
 * Reduce texto ornamental y prioriza contexto operacional util.
 */
@Component({
  selector: 'app-panel-resumen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-resumen.component.html',
  styleUrls: ['./panel-resumen.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelResumenComponent {
  @Input() seccion: SeguimientoSubmenu | null = null;

  trackByCapacidad(_: number, item: string) {
    return item;
  }
}
