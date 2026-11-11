import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { StatsService } from '@pages/statistics/state/overview/stats.service';
import { Statistics } from '@pages/statistics/statistics';

describe('Statistics', () => {
  let component: Statistics;
  let fixture: ComponentFixture<Statistics>;
  const loading = signal(true);
  const error = signal('');
  const reload = vi.fn();

  beforeEach(async () => {
    localStorage.removeItem('lifeos.stats.module');
    loading.set(true);
    error.set('');
    reload.mockClear();
    await TestBed.configureTestingModule({
      imports: [Statistics],
      providers: [
        provideRouter([]),
        {
          provide: StatsService,
          useValue: {
            loading,
            error,
            reload,
            ensureFuelLoaded: vi.fn(),
            dashboard: () => ({
              empty: true,
              emptyTitle: 'No records yet',
              emptyMessage: 'Add records to see your progress.',
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Statistics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => localStorage.removeItem('lifeos.stats.module'));

  it('matches skeletons to the selected module without rendering charts', async () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.loading-kpis .metric')).toHaveLength(6);
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Loading Books statistics',
    );
    expect(page.querySelector('app-chart')).toBeNull();
    component.choose('budget');
    await fixture.whenStable();
    expect(page.querySelectorAll('.loading-kpis .metric')).toHaveLength(4);
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Loading Budget statistics',
    );
  });

  it('replaces skeletons with the empty state once loading completes', async () => {
    loading.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-statistics-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.stats-empty')?.textContent).toContain(
      'No records yet',
    );
  });

  it('shows an actionable error after loading fails', async () => {
    error.set('Could not load statistics');
    loading.set(false);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('app-statistics-skeleton')).toBeNull();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not load statistics',
    );
    page.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    expect(reload).toHaveBeenCalledWith('books');
  });
});
