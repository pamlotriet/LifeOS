import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { AuthService } from '../../../state/authentication/authentication.service';

@Component({
  imports: [IonContent, IonIcon, RouterLink],
  selector: 'app-more',
  styleUrl: './more.css',
  templateUrl: './more.html',
})
export class More {
  private readonly auth = inject(AuthService);
  readonly signingOut = signal(false);
  readonly error = signal('');

  async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true); this.error.set('');
    try { await this.auth.logout(); }
    catch { this.error.set('Could not sign out. Please try again.'); }
    finally { this.signingOut.set(false); }
  }
}
