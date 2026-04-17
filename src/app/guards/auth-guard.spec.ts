import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthGuard } from './auth-guard';
import { AuthService } from '../services/auth';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: { estaAutenticado: () => true }
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) }
        }
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
