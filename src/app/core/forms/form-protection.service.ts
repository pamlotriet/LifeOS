import { Injectable, inject } from '@angular/core';
import { CanDeactivateFn, Routes } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

export interface ProtectedForm {
  element: HTMLElement;
  dirty(): boolean;
  saving(): boolean;
  markSaved(): void;
}

@Injectable({ providedIn: 'root' })
export class FormProtection {
  private readonly i18n = inject(TranslateService);
  private readonly forms = new Set<ProtectedForm>();
  register(form: ProtectedForm): () => void {
    this.forms.add(form);
    return () => this.forms.delete(form);
  }
  private active(scope?: HTMLElement): ProtectedForm[] {
    return [...this.forms].filter(
      (form) =>
        (!scope || scope.contains(form.element)) &&
        form.element.isConnected &&
        !form.element.closest('.ion-page-hidden, [hidden], [inert]') &&
        form.element.getClientRects().length > 0,
    );
  }
  hasChanges(scope?: HTMLElement): boolean {
    return this.active(scope).some((form) => form.dirty() || form.saving());
  }
  canLeave(scope?: HTMLElement): boolean {
    const forms = this.active(scope);
    if (forms.some((form) => form.saving())) return false;
    const changed = forms.filter((form) => form.dirty());
    if (!changed.length) return true;
    if (!window.confirm(this.i18n.instant('Discard unsaved changes?'))) return false;
    changed.forEach((form) => form.markSaved());
    return true;
  }
}

export const unsavedChangesGuard: CanDeactivateFn<unknown> = () =>
  inject(FormProtection).canLeave();

/** Apply to route leaves, including lazy feature routes and inline editors. */
export function protectFormRoutes(routes: Routes): Routes {
  return routes.map((route) => ({
    ...route,
    ...(route.component || route.loadComponent
      ? { canDeactivate: [...(route.canDeactivate ?? []), unsavedChangesGuard] }
      : {}),
    ...(route.children ? { children: protectFormRoutes(route.children) } : {}),
  }));
}
