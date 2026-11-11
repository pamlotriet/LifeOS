import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';

export type SkeletonVariant = 'cards' | 'list' | 'grid' | 'form' | 'chart' | 'rectangle' | 'circle';

/** A layout-preserving placeholder for every async LifeOS screen. */
@Component({
  imports: [TranslatePipe],
  selector: 'app-skeleton',
  host: {
    '[attr.aria-hidden]': "variant() === 'rectangle' || variant() === 'circle' ? 'true' : null",
  },
  template: `@if (variant() === 'rectangle' || variant() === 'circle') {
      <span
        class="block h-full w-full animate-pulse bg-secondary motion-reduce:animate-none"
        [class.rounded-full]="variant() === 'circle'"
        [class.rounded-md]="variant() === 'rectangle'"
      ></span>
    } @else {
      <section
        class="skeleton"
        [class]="'skeleton ' + variant()"
        [attr.aria-label]="'Loading content' | translate"
        aria-busy="true"
      >
        @if (variant() === 'chart') {
          <i class="title"></i><i class="chart-block"></i><i class="line wide"></i>
        } @else {
          @for (item of rows(); track $index) {
            <div class="skeleton-row">
              <i class="avatar"></i><span><i class="line wide"></i><i class="line"></i></span>
            </div>
          }
        }
      </section>
    } `,
  styleUrl: './app-skeleton.css',
})
export class AppSkeleton {
  readonly variant = input<SkeletonVariant>('list');
  readonly count = input(4);
  rows(): number[] {
    return Array.from({ length: this.count() });
  }
}
