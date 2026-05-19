import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoFiltrosAvanzados, SeguimientoFiltroState } from '../../interfaces/seguimiento-operacional.interface';
import {
  OperationalFilterOptions,
  OperationalFilterState
} from '../../interfaces/seguimiento-operacional-dashboard.interface';

/**
 * Panel compacto de filtros avanzados.
 * Centraliza filtros tacticos actuales y deja puntos de extension para
 * fechas, presets y filtros dinamicos futuros sin recargar el shell.
 */
@Component({
  selector: 'app-filtros-operacionales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtros-operacionales.component.html',
  styleUrls: ['./filtros-operacionales.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltrosOperacionalesComponent {
  @Input({ required: true }) filtros!: SeguimientoFiltroState;
  @Input({ required: true }) filtrosAvanzados!: SeguimientoFiltrosAvanzados;
  @Input({ required: true }) filtrosOperacionales!: OperationalFilterState;
  @Input({ required: true }) opciones!: OperationalFilterOptions;

  @Output() aplicar = new EventEmitter<void>();
  @Output() limpiar = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  readonly presets = [
    { value: 'hoy', label: 'Hoy' },
    { value: '24h', label: '24 h' },
    { value: '48h', label: '48 h' },
    { value: '7d', label: '7 d' },
    { value: '30d', label: '30 d' }
  ] as const;
}
