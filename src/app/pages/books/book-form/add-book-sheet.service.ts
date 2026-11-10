import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AddBookSheet {
  private readonly modals = inject(ModalController);
  private opening = false;

  async open(): Promise<void> {
    if (this.opening) return;
    this.opening = true;
    try {
      const { BookForm } = await import('./book-form');
      const modal = await this.modals.create({
        component: BookForm,
        componentProps: { embedded: true },
        cssClass: 'add-book-sheet',
        breakpoints: [0, 1],
        initialBreakpoint: 1,
        handle: false,
        backdropDismiss: false,
        canDismiss: async (_data, role) => role === 'saved' || !modal.querySelector('app-book-form button[type="submit"]:disabled'),
        htmlAttributes: { 'aria-label': 'Add book' },
      });
      await modal.present();
      await modal.onDidDismiss();
    } finally { this.opening = false; }
  }
}

