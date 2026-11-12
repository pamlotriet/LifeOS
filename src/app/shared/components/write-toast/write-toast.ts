import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WriteFeedback } from '@core/firebase/write-feedback.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-write-toast',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './write-toast.html',
  styleUrl: './write-toast.css',
})
export class WriteToast {
  readonly writeFeedback = inject(WriteFeedback);
}
