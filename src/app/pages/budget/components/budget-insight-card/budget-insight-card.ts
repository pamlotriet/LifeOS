import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { RouterLink } from '@angular/router';
import { budgetInsights } from '@pages/budget/budget-insights/budget-insights.model';
@Component({
  selector: 'article[appBudgetInsightCard]',
  imports: [AppButton, TranslatePipe, RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-insight-card.html',
  styleUrl: './budget-insight-card.css',
})
export class BudgetInsightCard {
  readonly item = input.required<ReturnType<typeof budgetInsights>[number]>();
}
