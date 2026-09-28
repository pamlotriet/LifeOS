import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { PasswordInput, PasswordRecord } from './password.model';
import { PasswordVaultService } from './password-vault.service';

@Injectable({ providedIn: 'root' })
export class PasswordStore {
  private readonly auth = inject(AuthService); readonly vault = inject(PasswordVaultService);
  readonly records = signal<PasswordRecord[]>([]); readonly vaultExists = signal<boolean | null>(null); readonly loading = signal(false); readonly error = signal('');
  readonly sorted = computed(() => [...this.records()].sort((a, b) => a.name.localeCompare(b.name)));
  constructor() { effect(() => { const uid = this.auth.userId(); const unlocked = this.vault.crypto.unlocked(); untracked(() => { if (!uid) { this.vault.crypto.lock(); this.records.set([]); this.vaultExists.set(null); } else if (unlocked) void this.reload(); else this.records.set([]); }); }); }
  async initialize(): Promise<void> { this.loading.set(true); try { this.vaultExists.set(await this.vault.exists()); } catch { this.error.set('Could not load your vault.'); } finally { this.loading.set(false); } }
  async create(passphrase: string): Promise<void> { await this.vault.create(passphrase); this.vaultExists.set(true); this.records.set([]); }
  async unlock(passphrase: string): Promise<void> { await this.vault.unlock(passphrase); await this.reload(); }
  lock(): void { this.vault.crypto.lock(); this.records.set([]); }
  async reload(): Promise<void> { if (!this.vault.crypto.unlocked()) return; this.loading.set(true); this.error.set(''); try { this.records.set(await this.vault.list()); } catch { this.error.set('Could not decrypt your passwords. Lock and try again.'); } finally { this.loading.set(false); } }
  async get(id: string): Promise<PasswordRecord> { return this.records().find((record) => record.id === id) ?? this.vault.get(id); }
  async save(input: PasswordInput, id?: string): Promise<PasswordRecord> { const saved = await this.vault.save(input, id); this.records.update((items) => [...items.filter((item) => item.id !== saved.id), saved]); return saved; }
  async delete(id: string): Promise<void> { await this.vault.delete(id); this.records.update((items) => items.filter((item) => item.id !== id)); }
}
