import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { UserDataBackupService } from '@core/backups/user-data-backup.service';

@Component({
  selector: 'app-data-backup',
  imports: [TranslatePipe, AppButton],
  host: { class: 'block' },
  template: `<section
    class="rounded-2xl border border-border bg-card p-5 text-foreground"
    [attr.aria-label]="'Download my data' | translate"
  >
    <h2 class="m-0 text-base font-semibold">
      {{ 'Download my data' | translate }}
    </h2>
    <p class="mt-2 text-sm leading-relaxed text-(--text-secondary)">
      {{
        'Save a full account copy as a ZIP: records, debt payment history, nested data and uploaded files.'
          | translate
      }}
    </p>
    <p class="mt-2 text-xs leading-relaxed text-(--text-secondary)">
      {{
        'Your password vault stays encrypted. Keep this file private and retain your master password.'
          | translate
      }}
    </p>
    <button
      appButton="secondary"
      type="button"
      class="mt-4"
      [disabled]="backup.busy()"
      (click)="download()"
    >
      {{ (backup.busy() ? 'Preparing your backup...' : 'Download full account copy') | translate }}
    </button>
    @if (backup.busy()) {
      <p class="mt-3 text-xs text-(--text-secondary)" role="status" aria-live="polite">
        {{
          'backup.progress'
            | translate: { p0: backup.progress().documents, p1: backup.progress().files }
        }}
      </p>
    }
    @if (result()) {
      <p class="mt-3 text-sm text-(--text-secondary)" role="status">
        {{ 'backup.completed' | translate: { p0: result()!.documents, p1: result()!.files } }}
      </p>
    }
    @if (error()) {
      <p class="mt-3 text-sm text-destructive" role="alert">{{ error() | translate }}</p>
    }
  </section>`,
})
export class AppDataBackup {
  readonly backup = inject(UserDataBackupService);
  readonly error = signal('');
  readonly result = signal<{ documents: number; files: number } | null>(null);
  async download(): Promise<void> {
    this.error.set('');
    this.result.set(null);
    try {
      this.result.set(await this.backup.download());
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Could not download your backup. Please try again.',
      );
    }
  }
}
