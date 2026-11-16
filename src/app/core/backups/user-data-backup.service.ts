import { Injectable, inject, Injector, signal } from '@angular/core';
import { AuthService } from '@core/authentication/authentication.service';
import { environment } from '@environments/environment';
import { BackupProgress } from '@core/backups/user-data-export';

@Injectable({ providedIn: 'root' })
export class UserDataBackupService {
  private readonly injector = inject(Injector);
  readonly busy = signal(false);
  readonly progress = signal<BackupProgress>({ phase: 'records', documents: 0, files: 0 });
  async download(): Promise<{ documents: number; files: number } | null> {
    if (this.busy()) return null;
    this.busy.set(true);
    this.progress.set({ phase: 'records', documents: 0, files: 0 });
    try {
      const auth = this.injector.get(AuthService);
      const { uid, token } = await auth.getSession();
      const assertUser = () => {
        if (auth.userId() !== uid) throw new Error('Your account changed. Start the backup again.');
      };
      const request = async (url: string, init: RequestInit = {}) => {
        assertUser();
        const storage = new URL(url).hostname === 'firebasestorage.googleapis.com';
        const response = await fetch(url, {
          ...init,
          headers: {
            Authorization: `${storage ? 'Firebase' : 'Bearer'} ${token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          },
          signal: AbortSignal.timeout(60000),
          cache: 'no-store',
        });
        assertUser();
        if (!response.ok)
          throw new Error(
            'Could not read all account data. No backup was downloaded. Please retry after checking your connection and account permissions.',
          );
        return response;
      };
      const [{ collectUserExport }, { zipSync }] = await Promise.all([
        import('@core/backups/user-data-export'),
        import('fflate'),
      ]);
      const backup = await collectUserExport({
        uid,
        project: environment.firebaseConfig.projectId,
        bucket: environment.firebaseConfig.storageBucket,
        progress: (value) => this.progress.set(value),
        transport: {
          json: async (url, init) => (await request(url, init)).json(),
          bytes: async (url) => new Uint8Array(await (await request(url)).arrayBuffer()),
        },
      });
      assertUser();
      const zipped = zipSync(backup.files, { level: 6 });
      const blob = new Blob([new Uint8Array(zipped).buffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LifeOS-account-backup-${uid}-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return {
        documents: backup.manifest.documentCount,
        files: backup.manifest.storageObjects.length,
      };
    } finally {
      this.busy.set(false);
    }
  }
}
