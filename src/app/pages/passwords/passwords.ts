import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PASSWORD_CATEGORIES } from '../../shared/state/passwords/password.model';
import { PasswordStore } from '../../shared/state/passwords/password-store';

@Component({ selector: 'app-passwords', imports: [IonContent, IonIcon, RouterLink, FormsModule, PageHeader], templateUrl: './passwords.html' })
export class Passwords {
  readonly store = inject(PasswordStore); readonly categories = PASSWORD_CATEGORIES; readonly search = signal(''); readonly category = signal('All');
  readonly masterPassword = signal(''); readonly confirmation = signal(''); readonly busy = signal(false); readonly message = signal('');
  readonly filtered = computed(() => { const query = this.search().trim().toLowerCase(); return this.store.sorted().filter((item) => (this.category() === 'All' || item.category === this.category()) && (!query || [item.name, item.username, item.website, ...item.tags].some((value) => value.toLowerCase().includes(query)))); });
  constructor() { void this.store.initialize(); }
  async submitVault(): Promise<void> { if (this.busy()) return; this.busy.set(true); this.message.set(''); try { if (this.store.vaultExists()) await this.store.unlock(this.masterPassword()); else { if (this.masterPassword() !== this.confirmation()) throw new Error('Master passwords do not match.'); await this.store.create(this.masterPassword()); } this.masterPassword.set(''); this.confirmation.set(''); } catch (error) { this.message.set(error instanceof Error ? error.message : 'Could not unlock the vault.'); } finally { this.busy.set(false); } }
}
