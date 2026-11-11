import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppCarousel } from '@shared/components/app-carousel/app-carousel';

@Component({
  imports: [AppCarousel],
  template: `<app-carousel
    label="Overview"
    previousLabel="Previous"
    nextLabel="Next"
    [autoScroll]="false"
    ><a href="/one">One</a><a href="/two">Two</a><a href="/three">Three</a></app-carousel
  >`,
})
class CarouselHost {}

describe('AppCarousel', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    ),
  );
  afterEach(() => vi.unstubAllGlobals());
  it('scrolls projected slides and wraps at either end', async () => {
    const fixture = TestBed.createComponent(CarouselHost);
    await fixture.whenStable();
    const track = fixture.nativeElement.querySelector('.carousel-track') as HTMLElement;
    const slides = Array.from(track.children);
    slides.forEach((slide, index) =>
      Object.defineProperty(slide, 'offsetLeft', { value: index * 200 }),
    );
    Object.defineProperty(track, 'scrollWidth', { value: 600 });
    Object.defineProperty(track, 'clientWidth', { value: 200 });
    track.scrollTo = vi.fn();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();
    expect(track.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 200 }));
    track.scrollLeft = 400;
    buttons[1].click();
    expect(track.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0 }));
    track.scrollLeft = 0;
    buttons[0].click();
    expect(track.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 400 }));
    expect(buttons[0].getAttribute('aria-controls')).toBe(track.id);
  });
});
