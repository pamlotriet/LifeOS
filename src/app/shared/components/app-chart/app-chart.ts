import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  inject,
  DestroyRef,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

@Component({
  selector: 'app-chart',
  imports: [TranslatePipe],
  template:
    '<div class="chart-frame" [style.height.px]="height"><canvas #canvas role="img" [attr.aria-label]="label | translate"></canvas></div>',
  styles: ':host { display:block; min-width:0; } .chart-frame { position:relative; }',
})
export class AppChart implements AfterViewInit, OnChanges, OnDestroy {
  private readonly translations = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  @Input({ required: true }) config!: ChartConfiguration;
  @Input() label = '';
  @Input() height = 230;
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  constructor() {
    this.translations.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.render());
  }
  ngAfterViewInit(): void {
    this.render();
  }
  ngOnChanges(): void {
    this.render();
  }
  ngOnDestroy(): void {
    this.chart?.destroy();
  }
  private render(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    const config: ChartConfiguration = {
      ...this.config,
      data: {
        ...this.config.data,
        labels: this.config.data.labels?.map((label) =>
          typeof label === 'string' ? this.translations.instant(label) : label,
        ),
        datasets: this.config.data.datasets.map((dataset) => ({
          ...dataset,
          label: dataset.label ? this.translations.instant(dataset.label) : dataset.label,
        })),
      },
    };
    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
