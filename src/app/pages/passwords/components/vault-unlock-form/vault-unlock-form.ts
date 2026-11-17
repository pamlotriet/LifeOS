import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';

import { model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppButton } from '@shared/components/app-button/app-button';
@Component({
  selector: 'section[appVaultUnlockForm]',
  imports: [TranslatePipe, IonIcon, FormsModule, AppInput, AppButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vault-unlock-form.html',
})
export class VaultUnlockForm {
  readonly vaultExists = input.required<boolean>();
  readonly busy = input(false);
  readonly message = input('');
  readonly masterPassword = model('');
  readonly confirmation = model('');
  readonly unlock = output<void>();
}
