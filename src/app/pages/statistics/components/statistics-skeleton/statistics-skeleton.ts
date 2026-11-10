import { Component, input } from '@angular/core';

@Component({
  selector: 'app-statistics-skeleton',
  template: `
    <section
      class="stats-loading"
      [class.books]="module() === 'books'"
      [class.budget]="module() === 'budget'"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span class="sr-only">Loading {{ label() }} statistics</span>
      <div class="loading-content" aria-hidden="true">
        @if (module() === 'budget') {
          <div class="report-title"><i class="line heading"></i><i class="line caption"></i></div>
        }
        <div class="loading-kpis">
          @for (item of module() === 'books' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3]; track item) {
            <div class="placeholder-card metric">
              <i class="line label"></i><i class="line value"></i><i class="line caption"></i>
            </div>
          }
        </div>
        <div class="loading-charts">
          <div class="placeholder-card">
            <i class="line heading"></i><i class="line caption"></i>
            <div class="bar-chart">
              @for (height of [38, 64, 47, 82, 58, 92, 70, 54]; track $index) {
                <i [style.height.%]="height"></i>
              }
            </div>
            <div class="axis"><i></i><i></i><i></i><i></i></div>
            @if (module() === 'books') {
              <div class="chart-divider"></div>
              <i class="line heading"></i>
              <div class="mini-chart"><i></i><i></i><i></i></div>
            }
          </div>
          <div class="placeholder-card">
            <i class="line heading"></i><i class="line caption"></i>
            @if (module() === 'books') {
              @for (width of [90, 72, 55, 40, 28]; track $index) {
                <div class="list-row">
                  <i class="line label"></i><i class="line bar" [style.width.%]="width"></i>
                </div>
              }
              <div class="chart-divider"></div>
              <i class="line heading"></i>
              @for (item of [0, 1, 2]; track item) {
                <div class="list-row"><i class="line bar"></i></div>
              }
            } @else {
              <div class="trend-chart">
                <svg viewBox="0 0 400 180" preserveAspectRatio="none">
                  <path d="M0 140 55 110 110 125 165 70 220 90 275 40 330 65 400 20" />
                </svg>
              </div>
              <div class="axis"><i></i><i></i><i></i><i></i></div>
            }
          </div>
        </div>
        <div class="placeholder-card loading-details">
          <i class="line heading"></i><i class="line caption"></i>
          @for (item of [0, 1, 2]; track item) {
            <div class="list-row"><i class="line bar"></i></div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './statistics-skeleton.css',
})
export class StatisticsSkeleton {
  readonly module = input.required<string>();
  readonly label = input.required<string>();
}
