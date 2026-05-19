import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SeguimientoCardOperacional,
  SeguimientoMetrica
} from '../../interfaces/seguimiento-operacional.interface';

/**
 * Renderiza tarjetas y metricas de resumen con un DOM compacto.
 * El objetivo es reutilizar el mismo bloque para distintas secciones
 * sin acoplar el layout al componente contenedor.
 */
@Component({
  selector: 'app-cards-operacionales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cards-operacionales.component.html',
  styleUrls: ['./cards-operacionales.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardsOperacionalesComponent {
  @Input() metricas: SeguimientoMetrica[] = [];
  @Input() cards: SeguimientoCardOperacional[] = [];

  trackByMetric(_: number, item: SeguimientoMetrica) {
    return item.label;
  }

  trackByCard(_: number, item: SeguimientoCardOperacional) {
    return item.id;
  }
}
