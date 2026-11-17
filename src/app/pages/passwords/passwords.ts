import { EmptyState } from '@shared/components/empty-state/empty-state';
import { VaultUnlockForm } from '@pages/passwords/components/vault-unlock-form/vault-unlock-form';
import { PasswordListItem } from '@pages/passwords/components/password-list-item/password-list-item';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PASSWORD_CATEGORIES } from '@pages/passwords/state/vault/password.model';
import { PasswordStore } from '@pages/passwords/state/vault/password-store';

@Component({
  selector: 'app-passwords',
  imports: [
    EmptyState,
    VaultUnlockForm,
    PasswordListItem,
    TranslatePipe,
    AppInput,
    AppButton,
    IonContent,
    IonIcon,
    RouterLink,
    PageHeader,
  ],
  templateUrl: './passwords.html',
})
export class Passwords {
  readonly store = inject(PasswordStore);
  readonly vaultLoading = computed(
    () =>
      this.store.vaultExists() === null ||
      (this.store.loading() && !this.store.vault.crypto.unlocked()),
  );
  readonly categories = PASSWORD_CATEGORIES;
  readonly search = signal('');
  readonly category = signal('All');
  readonly masterPassword = signal('');
  readonly confirmation = signal('');
  readonly busy = signal(false);
  readonly message = signal('');
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.store
      .sorted()
      .filter(
        (item) =>
          (this.category() === 'All' || item.category === this.category()) &&
          (!query ||
            [item.name, item.username, item.website, ...item.tags].some((value) =>
              value.toLowerCase().includes(query),
            )),
      );
  });
  constructor() {
    void this.store.initialize();
  }
  async submitVault(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      if (this.store.vaultExists()) await this.store.unlock(this.masterPassword());
      else {
        if (this.masterPassword() !== this.confirmation())
          throw new Error('Master passwords do not match.');
        await this.store.create(this.masterPassword());
      }
      this.masterPassword.set('');
      this.confirmation.set('');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Could not unlock the vault.');
    } finally {
      this.busy.set(false);
    }
  }
}
