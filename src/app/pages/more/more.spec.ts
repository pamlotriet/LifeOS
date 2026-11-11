import { ComponentFixture, TestBed } from '@angular/core/testing';
import { More } from '@pages/more/more';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/authentication/authentication.service';
import { AppUpdates } from '@core/updates/app-updates.service';
import { vi } from 'vitest';

describe('More', () => {
  let component: More;
  let fixture: ComponentFixture<More>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [More],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn().mockResolvedValue(undefined) } },
        { provide: AppUpdates, useValue: { enabled: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(More);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
