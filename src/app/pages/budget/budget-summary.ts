import { Component, Input } from '@angular/core';
import { BudgetCategory, BudgetTransaction, money, summary } from '../../shared/state/budget/budget.model';
@Component({selector:'app-budget-summary',template:`<div class="budget-kpis" aria-label="Recorded budget figures">@for(card of cards();track card.label){<article [class.balance-kpi]="card.balance"><span>{{card.label}}</span><strong [class.deficit]="card.balance && card.amount < 0">{{money(card.amount)}}</strong><small>{{card.note}}</small></article>}</div>`,styles:`:host{display:block}.budget-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.budget-kpis article{min-width:0;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px}.budget-kpis span{font-size:.78rem;color:var(--text-secondary)}.budget-kpis strong{display:block;font-size:clamp(1.3rem,2.2vw,1.85rem);font-weight:650;letter-spacing:-.035em;margin:12px 0 9px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.budget-kpis small{color:var(--text-secondary);font-size:.72rem;line-height:1.5;display:block}.budget-kpis .balance-kpi{border-color:color-mix(in srgb,var(--primary) 45%,var(--border));background:color-mix(in srgb,var(--primary) 5%,var(--card))}.balance-kpi strong{color:var(--primary)}.balance-kpi strong.deficit{color:var(--destructive)}@media(max-width:750px){.budget-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.budget-kpis article{padding:16px}}`})
export class BudgetSummary {
  @Input() transactions:BudgetTransaction[]=[];
  @Input() categories:BudgetCategory[]=[];
  readonly money=money;
  cards(){const v=summary(this.transactions,this.categories);return [
    {label:'Recorded income',amount:v.income,note:'Income added for this cycle',balance:false},
    {label:'Actual spending',amount:v.expenses,note:`Includes ${money(v.bills)} bills; includes debt payments`,balance:false},
    {label:'Savings transfers',amount:v.savings,note:'Moved to savings, separate from spending',balance:false},
    {label:'Balance from records',amount:v.remaining,note:'Income − spending − savings transfers',balance:true},
  ];}
}
