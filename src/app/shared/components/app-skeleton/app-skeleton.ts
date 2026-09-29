import { Component, input } from '@angular/core';

export type SkeletonVariant = 'cards' | 'list' | 'grid' | 'form' | 'chart';

/** A layout-preserving placeholder for every async LifeOS screen. */
@Component({
  selector: 'app-skeleton',
  template: `<section class="skeleton" [class]="'skeleton ' + variant()" aria-label="Loading content" aria-busy="true">
    @if (variant() === 'chart') { <i class="title"></i><i class="chart-block"></i><i class="line wide"></i> }
    @else { @for (item of rows(); track $index) { <div class="skeleton-row"><i class="avatar"></i><span><i class="line wide"></i><i class="line"></i></span></div> } }
  </section>`,
  styleUrl: './app-skeleton.css',
})
export class AppSkeleton {
  readonly variant = input<SkeletonVariant>('list');
  readonly count = input(4);
  rows(): number[] { return Array.from({ length: this.count() }); }
}
