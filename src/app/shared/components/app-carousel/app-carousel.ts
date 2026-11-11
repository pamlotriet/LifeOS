import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { AppButton } from '@shared/components/app-button/app-button';

let nextCarouselId = 0;

/** Projects direct child slides; consumers control their content and responsive widths. */
@Component({
  selector: 'app-carousel',
  imports: [AppButton],
  templateUrl: './app-carousel.html',
  styleUrl: './app-carousel.css',
  host: { class: 'block min-w-0' },
})
export class AppCarousel {
  readonly label = input.required<string>();
  readonly previousLabel = input.required<string>();
  readonly nextLabel = input.required<string>();
  readonly autoScroll = input(true);
  readonly interval = input(5000);
  readonly showArrows = input(true);
  readonly trackId = `app-carousel-${nextCarouselId++}`;
  readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private carouselHovered = false;
  private carouselFocused = false;
  private lastCarouselInteraction = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const timer = window.setInterval(
        () => {
          if (
            this.autoScroll() &&
            !document.hidden &&
            !reducedMotion.matches &&
            !this.carouselHovered &&
            !this.carouselFocused &&
            Date.now() - this.lastCarouselInteraction > 6000
          ) {
            this.scroll(1);
          }
        },
        Math.max(1000, this.interval()),
      );
      destroyRef.onDestroy(() => window.clearInterval(timer));
    });
  }

  setHover(hovered: boolean): void {
    this.carouselHovered = hovered;
  }

  setFocus(focused: boolean, event?: FocusEvent): void {
    this.carouselFocused =
      focused ||
      !!(
        event?.relatedTarget instanceof Node &&
        this.track()?.nativeElement.parentElement?.contains(event.relatedTarget)
      );
  }

  noteInteraction(): void {
    this.lastCarouselInteraction = Date.now();
  }

  scroll(direction: number, manual = false): void {
    if (manual) this.noteInteraction();
    const track = this.track()?.nativeElement;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    if (!cards.length) return;
    const current = cards.reduce(
      (nearest, card, index) =>
        Math.abs(card.offsetLeft - cards[0].offsetLeft - track.scrollLeft) <
        Math.abs(cards[nearest].offsetLeft - cards[0].offsetLeft - track.scrollLeft)
          ? index
          : nearest,
      0,
    );
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    const target =
      direction > 0 && atEnd
        ? 0
        : direction < 0 && track.scrollLeft <= 2
          ? cards.length - 1
          : Math.max(0, Math.min(cards.length - 1, current + direction));
    track.scrollTo({
      left: cards[target].offsetLeft - cards[0].offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
}
