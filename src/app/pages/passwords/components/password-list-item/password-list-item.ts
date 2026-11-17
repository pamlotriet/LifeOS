import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PasswordRecord } from '@pages/passwords/state/vault/password.model';
@Component({
  selector: 'a[appPasswordListItem]',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-list-item.html',
})
export class PasswordListItem {
  readonly item = input.required<Pick<PasswordRecord, 'name' | 'username' | 'favourite'>>();
}
