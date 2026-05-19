import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SeguimientoMapState, SeguimientoSidebarLayoutState } from '../interfaces/seguimiento-operacional.interface';

/**
 * Estado UI compartido del centro de mando.
 * Sincroniza sidebar, mapa y revision de layout para evitar estados
 * divergentes entre controles, contenedores y Leaflet.
 */
@Injectable({
  providedIn: 'root'
})
export class SeguimientoOperacionalUiService {
  private readonly sidebarStateSubject = new BehaviorSubject<SeguimientoSidebarLayoutState>({
    visible: true,
    compacto: false,
    width: 310
  });

  private readonly mapStateSubject = new BehaviorSubject<SeguimientoMapState>({
    visible: true,
    expandido: false,
    fullscreen: false,
    modoTactico: true
  });

  private readonly layoutRevisionSubject = new BehaviorSubject<number>(0);

  readonly sidebarState$ = this.sidebarStateSubject.asObservable();
  readonly mapState$ = this.mapStateSubject.asObservable();
  readonly layoutRevision$ = this.layoutRevisionSubject.asObservable();

  get sidebarState() {
    return this.sidebarStateSubject.value;
  }

  get mapState() {
    return this.mapStateSubject.value;
  }

  get layoutRevision() {
    return this.layoutRevisionSubject.value;
  }

  actualizarSidebar(state: Partial<SeguimientoSidebarLayoutState>) {
    this.sidebarStateSubject.next({
      ...this.sidebarState,
      ...state
    });
    this.bumpLayoutRevision();
  }

  actualizarMapa(state: Partial<SeguimientoMapState>) {
    this.mapStateSubject.next({
      ...this.mapState,
      ...state
    });
    this.bumpLayoutRevision();
  }

  alternarMapaVisible() {
    this.actualizarMapa({ visible: !this.mapState.visible });
  }

  alternarMapaExpandido() {
    this.actualizarMapa({ expandido: !this.mapState.expandido, visible: true });
  }

  alternarModoTactico() {
    this.actualizarMapa({ modoTactico: !this.mapState.modoTactico, visible: true });
  }

  alternarFullscreenMapa() {
    this.actualizarMapa({ fullscreen: !this.mapState.fullscreen, visible: true });
  }

  bumpLayoutRevision() {
    this.layoutRevisionSubject.next(this.layoutRevision + 1);
  }
}
