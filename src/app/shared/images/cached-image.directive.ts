import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../state/authentication/authentication.service';
import { ImageCacheService } from './image-cache.service';

@Directive({ selector: 'img[appCachedSrc]' })
export class CachedImageDirective {
  readonly appCachedSrc = input<string | null | undefined>();
  private readonly element = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private readonly cache = inject(ImageCacheService);
  private readonly auth = inject(AuthService);

  constructor() {
    effect((onCleanup) => {
      const source = this.appCachedSrc();
      const userId = this.auth.userId();
      const image = this.element.nativeElement;
      let active = true;
      let objectUrl: string | undefined;
      let observer: IntersectionObserver | undefined;
      image.removeAttribute('src');
      image.decoding = 'async';
      const fallback = () => {
        if (active && source && image.getAttribute('src') !== source) image.src = source;
      };
      image.addEventListener('error', fallback);
      const load = async () => {
        observer?.disconnect();
        if (!source) return;
        const blob = userId ? await this.cache.load(source, userId) : null;
        if (!active) return;
        try {
          objectUrl = blob ? URL.createObjectURL(blob) : undefined;
          image.src = objectUrl || source;
        } catch { fallback(); }
      };
      if (image.loading === 'lazy' && typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) void load();
        }, { rootMargin: '200px' });
        observer.observe(image);
      } else {
        void load();
      }
      onCleanup(() => {
        active = false;
        observer?.disconnect();
        image.removeEventListener('error', fallback);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      });
    });
  }
}
