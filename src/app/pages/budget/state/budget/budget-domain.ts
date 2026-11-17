import type { AuthService } from '@core/authentication/authentication.service';
import type { BudgetService } from '@pages/budget/state/budget/budget.service';
import type { BudgetStore } from '@pages/budget/state/budget/budget.store';

/** Domain operations share the facade's signals and load invalidation boundary. */
export abstract class BudgetDomain {
  constructor(
    protected readonly store: BudgetStore,
    protected readonly service: BudgetService,
    protected readonly auth: AuthService,
    protected readonly changed: () => void,
  ) {}
}
