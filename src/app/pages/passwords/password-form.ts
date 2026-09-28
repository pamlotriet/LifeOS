import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AppSelect, SelectOption } from '../../shared/components/app-select/app-select';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { generatePassword } from '../../shared/state/passwords/password-generator';
import { PASSWORD_CATEGORIES, PasswordInput, PasswordRecord } from '../../shared/state/passwords/password.model';
import { PasswordStore } from '../../shared/state/passwords/password-store';

@Component({ selector: 'app-password-form', imports: [IonContent, FormsModule, AppSelect, PageHeader], templateUrl: './password-form.html' })
export class PasswordForm {
  private readonly route = inject(ActivatedRoute); readonly router = inject(Router); readonly store = inject(PasswordStore);
  readonly id = this.route.snapshot.paramMap.get('id'); readonly loading = signal(!!this.id); readonly saving = signal(false); readonly deleting = signal(false); readonly confirmDelete = signal(false); readonly error = signal(''); readonly reveal = signal(false); readonly showGenerator = signal(false); readonly tagInput = signal('');
  readonly categoryOptions: SelectOption[] = PASSWORD_CATEGORIES.map((value) => ({ value, label: value }));
  readonly length = signal(20); readonly uppercase = signal(true); readonly lowercase = signal(true); readonly numbers = signal(true); readonly symbols = signal(true);
  model: PasswordInput = { name: '', username: '', password: '', website: '', category: 'Personal', tags: [], notes: '', favourite: false };
  constructor() { if (!this.store.vault.crypto.unlocked()) void this.router.navigateByUrl('/passwords', { replaceUrl: true }); else if (this.id) void this.load(); }
  async load(): Promise<void> { try { const record = await this.store.get(this.id!); const { id, createdAt, updatedAt, ...input } = record; this.model = input; } catch { this.error.set('Could not decrypt this password.'); } finally { this.loading.set(false); } }
  setCategory(value: string): void { this.model.category = value as PasswordInput['category']; }
  addTag(): void { const value = this.tagInput().trim(); if (value && !this.model.tags.includes(value)) this.model.tags = [...this.model.tags, value]; this.tagInput.set(''); }
  removeTag(tag: string): void { this.model.tags = this.model.tags.filter((item) => item !== tag); }
  generate(): void { try { this.model.password = generatePassword({ length: this.length(), uppercase: this.uppercase(), lowercase: this.lowercase(), numbers: this.numbers(), symbols: this.symbols() }); this.reveal.set(true); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not generate password.'); } }
  async copy(value: string): Promise<void> { await navigator.clipboard.writeText(value); setTimeout(() => void navigator.clipboard.readText().then(async (current) => { if (current === value) await navigator.clipboard.writeText(''); }).catch(() => undefined), 30_000); }
  async save(): Promise<void> { if (this.saving()) return; this.saving.set(true); this.error.set(''); try { await this.store.save(this.model, this.id ?? undefined); await this.router.navigateByUrl('/passwords', { replaceUrl: true }); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save password.'); } finally { this.saving.set(false); } }
  async delete(): Promise<void> { if (!this.id || this.deleting()) return; this.deleting.set(true); this.error.set(''); try { await this.store.delete(this.id); await this.router.navigateByUrl('/passwords', { replaceUrl: true }); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not delete password.'); this.confirmDelete.set(false); } finally { this.deleting.set(false); } }
  strength(): number { const value = this.model.password; return Math.min(100, (value.length / 20) * 55 + (/[A-Z]/.test(value) ? 10 : 0) + (/[a-z]/.test(value) ? 10 : 0) + (/\d/.test(value) ? 10 : 0) + (/[^\w]/.test(value) ? 15 : 0)); }
}
