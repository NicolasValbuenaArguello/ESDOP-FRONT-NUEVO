import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationalMapRenderModel } from '../../interfaces/seguimiento-operacional-dashboard.interface';
import { SeguimientoMapLayerManager } from '../../map-utils/seguimiento-map-layer-manager';
// @ts-ignore
import leafletImage from 'leaflet-image';

const EMPTY_MAP_MODEL: OperationalMapRenderModel = {
  features: [],
  movements: [],
  selectedFeatureId: null,
  legendItems: [],
  totals: {
    visibles: '0',
    pelotones: '0',
    alertas: '0',
    movimientos: '0'
  }
};

/**
 * Vista de mapa táctica. El componente Angular solo orquesta inputs y resize;
 * todo el manejo de capas queda aislado en el layer manager.
 */
@Component({
  selector: 'app-mapa-operacional',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-operacional.component.html',
  styleUrls: ['./mapa-operacional.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapaOperacionalComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() titulo = 'Mapa operacional';
  @Input() descripcion = '';
  @Input() renderModel: OperationalMapRenderModel = EMPTY_MAP_MODEL;
  @Input() fullscreenExterno = false;
  @Input() layoutRevision = 0;

  @Output() featureSelected = new EventEmitter<string>();
  @Output() fullscreenRequested = new EventEmitter<void>();

  @ViewChild('leafletMap', { static: true }) private readonly leafletMapRef?: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;
  private readonly layerManager = new SeguimientoMapLayerManager((featureId) => {
    this.ngZone.run(() => this.featureSelected.emit(featureId));
  });

  constructor(private readonly ngZone: NgZone) {}

  ngAfterViewInit() {
    const host = this.leafletMapRef?.nativeElement;
    if (!host) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.layerManager.initialize(host);
      this.layerManager.render(this.renderModel);
      this.observeHost(host);
      this.scheduleResize();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['renderModel'] && !changes['renderModel'].firstChange) {
      this.ngZone.runOutsideAngular(() => this.layerManager.render(this.renderModel));
    }

    if ((changes['fullscreenExterno'] && !changes['fullscreenExterno'].firstChange) || changes['layoutRevision']) {
      this.scheduleResize();
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.layerManager.destroy();
  }

  solicitarFullscreen() {
    this.fullscreenRequested.emit();
  }

  trackLegend(_: number, item: { label: string }) {
    return item.label;
  }

  /**
   * Exporta el mapa visible como PNG usando Leaflet y sus capas ya renderizadas.
   */
  exportAsPng(fileName: string) {
    const map = this.layerManager.getMapInstance();
    if (!map) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      leafletImage(map, (error: unknown, canvas: HTMLCanvasElement) => {
        if (error || !canvas) {
          resolve(false);
          return;
        }
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${fileName}.png`;
        link.click();
        resolve(true);
      });
    });
  }

  private observeHost(host: HTMLDivElement) {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(host);
  }

  /**
   * Leaflet necesita esperar al frame posterior al cambio de layout para
   * recalcular correctamente la grilla y evitar un mapa “encogido”.
   */
  private scheduleResize() {
    requestAnimationFrame(() => {
      setTimeout(() => this.layerManager.resize(), 60);
    });
  }
}
