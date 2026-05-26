import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguimientoOperacional } from './seguimiento-operacional';

describe('SeguimientoOperacional', () => {
  let component: SeguimientoOperacional;
  let fixture: ComponentFixture<SeguimientoOperacional>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoOperacional],
    }).compileComponents();

    fixture = TestBed.createComponent(SeguimientoOperacional);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
