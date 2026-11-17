import { AppDataBackup } from '@shared/components/app-data-backup/app-data-backup';
import { TranslatePipe } from '@ngx-translate/core';
import { nutritionOutline } from 'ionicons/icons';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { AuthService } from '@core/authentication/authentication.service';
import { AppUpdates } from '@core/updates/app-updates.service';

@Component({
  imports: [AppDataBackup, TranslatePipe, IonContent, IonIcon, RouterLink],
  selector: 'app-more',
  styleUrl: './more.css',
  templateUrl: './more.html',
})
export class More {
  readonly nutritionIcon = nutritionOutline;
  readonly updates = inject(AppUpdates);
  private readonly auth = inject(AuthService);
  readonly signingOut = signal(false);
  readonly error = signal('');

  async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.error.set('');
    try {
      await this.auth.logout();
    } catch {
      this.error.set('Could not sign out. Please try again.');
    } finally {
      this.signingOut.set(false);
    }
  }
}
