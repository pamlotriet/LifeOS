import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { FuelPoint } from './fuel-analytics';
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
);
@Component({
  selector: 'app-fuel-chart',
  template:
    '<div class="fuel-chart-frame"><canvas #canvas role="img" [attr.aria-label]="label"></canvas></div>',
  styles:
    ':host{display:block;min-width:0}.fuel-chart-frame{position:relative;width:100%;height:260px;min-width:0}@media(max-width:600px){.fuel-chart-frame{height:220px}}',
})
export class FuelChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: FuelPoint[] = [];
  @Input() label = 'Fuel chart';
  @Input() kind: 'bar' | 'line' = 'line';
  @Input() unit = '';
  @Input() color = '--hue-mint';
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private theme?: MutationObserver;
  ngAfterViewInit(): void {
    this.render();
    this.theme = new MutationObserver(() => this.render());
    this.theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  ngOnChanges(): void {
    this.render();
  }
  ngOnDestroy(): void {
    this.theme?.disconnect();
    this.chart?.destroy();
  }
  private render(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    const css = getComputedStyle(this.canvas.nativeElement),
      accent = css.getPropertyValue(this.color).trim() || '#278c80',
      text = css.getPropertyValue('--text-secondary').trim() || '#64767b',
      grid = css.getPropertyValue('--border').trim() || '#dce5e6';
    const config: ChartConfiguration = {
      type: this.kind,
      data: {
        labels: this.points.map((p) => p.label),
        datasets: [
          {
            label: this.unit,
            data: this.points.map((p) => p.value),
            borderColor: accent,
            backgroundColor: this.kind === 'line' ? colorFill(accent) : accent,
            fill: this.kind === 'line',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0,
            spanGaps: false,
            ...(this.kind === 'bar' ? { borderRadius: 5, maxBarThickness: 48 } : {}),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${Number(ctx.raw).toLocaleString('en-ZA', { maximumFractionDigits: 2 })} ${this.unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: text, maxRotation: 40, autoSkip: true, maxTicksLimit: 6 },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: text,
              maxTicksLimit: 5,
              callback: (value) =>
                this.unit === 'ZAR'
                  ? `R ${Number(value).toLocaleString('en-ZA', { notation: 'compact' })}`
                  : String(value),
            },
            grid: { color: grid },
            border: { display: false },
          },
        },
      },
    };
    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}

function colorFill(color: string): string {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return color;
  context.fillStyle = color;
  const resolved = context.fillStyle;
  return /^#[0-9a-f]{6}$/i.test(resolved) ? `${resolved}22` : color;
}
