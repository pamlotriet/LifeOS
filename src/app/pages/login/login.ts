import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '@core/authentication/authentication.service';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular';
import {
  chevronForwardOutline,
  eyeOffOutline,
  lockClosedOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-login',
  imports: [TranslatePipe, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  host: { class: 'block h-full min-h-0' },
})
export class Login {
  protected readonly chevronIcon = chevronForwardOutline;
  protected readonly securityIcons = { lockClosedOutline, shieldCheckmarkOutline, eyeOffOutline };
  private readonly authService = inject(AuthService);
  readonly signInError = signal('');
  readonly signingIn = signal(false);

  async authenticate() {
    if (this.signingIn()) return;
    this.signInError.set('');
    this.signingIn.set(true);
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
      this.signInError.set(
        error instanceof Error && error.message.includes('Firebase user profile')
          ? 'Could not set up your account. Please try again.'
          : 'Could not sign in with Google. Please try again.',
      );
    } finally {
      this.signingIn.set(false);
    }
  }
}
