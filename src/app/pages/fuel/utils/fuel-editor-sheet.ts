import { DestroyRef, inject, signal } from '@angular/core';

/** Keep the editor presentation in sync with rotation and window resizing. */
export function fuelEditorSheet() {
  const mobile = signal(false);
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return mobile;
  const media = window.matchMedia('(max-width: 767px)');
  const update = () => mobile.set(media.matches);
  update();
  media.addEventListener('change', update);
  inject(DestroyRef).onDestroy(() => media.removeEventListener('change', update));
  return mobile;
}
