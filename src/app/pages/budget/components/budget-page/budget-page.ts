import { Directive } from '@angular/core';

/** Shared responsive page frame for every Budget screen. */
@Directive({
  selector: 'main[appBudgetPage]',
  host: {
    class:
      'budget-page m-0! box-border w-full max-w-none! min-w-0 px-4! pt-5! pb-[calc(40px+env(safe-area-inset-bottom))]! md:px-8! md:pt-7! [&>*]:min-w-0 max-sm:[&_.page-header]:grid! max-sm:[&_.page-header]:grid-cols-[auto_minmax(0,1fr)]! max-sm:[&_.page-header]:gap-3! max-sm:[&_.page-header]:border-0! max-sm:[&_.page-header]:bg-none! max-sm:[&_.page-header]:p-0! max-sm:[&_.page-header>:nth-child(n+3)]:col-span-full max-sm:[&_.page-header>:nth-child(n+3)]:w-full max-sm:[&_h1]:text-2xl! max-sm:[&_h1]:leading-tight! max-sm:[&_.section-heading]:items-start! max-sm:[&_.section-heading]:gap-3! max-sm:[&_.form-actions]:grid! max-sm:[&_.form-actions]:grid-cols-1! max-sm:[&_.form-actions]:gap-2! max-sm:[&_.form-actions>*]:min-w-0 max-sm:[&_.form-actions>*]:w-full max-sm:[&_.segments]:grid! max-sm:[&_.segments]:grid-cols-2! max-sm:[&_.segments]:gap-1! max-sm:[&_.segments>button]:min-h-11 max-sm:[&_.segments>button]:px-2! max-sm:[&_.segments>button]:text-xs! max-sm:[&_.month-nav]:w-full max-sm:[&_.month-nav]:max-w-none max-sm:[&_.month-nav]:flex-col! max-sm:[&_.month-nav]:items-stretch! max-sm:[&_.month-nav>app-month-picker]:flex-auto! max-sm:[&_input]:text-base! max-sm:[&_select]:text-base! max-sm:[&_textarea]:text-base! max-sm:[&_.data-table]:block max-sm:[&_.data-table]:overflow-x-auto max-sm:[&_.panel]:min-w-0 max-sm:[&_.panel]:break-words max-sm:[&_strong]:[overflow-wrap:anywhere]',
  },
})
export class BudgetPage {}
