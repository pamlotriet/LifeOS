import { inCycle } from '../../shared/state/budget/budget-cycle';
import { BudgetCategory, BudgetPlan, BudgetTransaction, categoryPlanItems, summary, supportsPlan, total } from '../../shared/state/budget/budget.model';
const round=(value:number)=>Math.round(value*100)/100;
export function budgetSnapshot(transactions:BudgetTransaction[],categories:BudgetCategory[],plans:BudgetPlan[],month:string,startDay:number){
  const recorded=transactions.filter(t=>t.paymentStatus!=='planned'&&inCycle(t.date,month,startDay));
  const values=summary(recorded,categories);
  const categoryPlans=categories.filter(c=>supportsPlan(c.type)).map(category=>{
    const plan=categoryPlanItems(plans,month,category.id);
    const actual=total(recorded.filter(t=>t.categoryId===category.id&&!t.debtId&&(category.type==='savings'?t.type==='transfer':t.type==='expense')));
    return {planned:plan.amount,actual,hasPlan:plan.items.length>0};
  });
  const categoryCommitments=round(categoryPlans.reduce((sum,p)=>sum+Math.max(0,p.planned-p.actual),0));
  const debtCommitments=round(transactions.filter(t=>t.type==='expense'&&t.debtId&&t.paymentStatus==='planned'&&inCycle(t.date,month,startDay)).reduce((sum,t)=>sum+t.amount,0));
  const commitments=round(categoryCommitments+debtCommitments);
  const allocationBase=Math.max(values.income,values.expenses+values.savings,1);
  return {...values,categoryCommitments,debtCommitments,commitments,afterPlans:round(values.remaining-commitments),
    hasPlans:categoryPlans.some(p=>p.hasPlan)||debtCommitments>0,
    recordedCount:recorded.length,expenseCount:recorded.filter(t=>t.type==='expense').length,
    debtPaid:total(recorded.filter(t=>t.type==='expense'&&!!t.debtId)),
    outflowPercent:values.income>0?Math.round((values.expenses+values.savings)/values.income*100):null,
    allocation:[{label:'Expenses',amount:values.expenses,percent:values.expenses/allocationBase*100,color:'var(--hue-rose)'},{label:'Savings transfers',amount:values.savings,percent:values.savings/allocationBase*100,color:'var(--hue-violet)'},{label:'Balance from records',amount:Math.max(0,values.remaining),percent:Math.max(0,values.remaining)/allocationBase*100,color:'var(--hue-mint)'}],
  };
}
export function budgetSpending(transactions:BudgetTransaction[],categories:BudgetCategory[]){
  const expenses=transactions.filter(t=>t.type==='expense'&&t.paymentStatus!=='planned');
  const sum=total(expenses),grouped=new Map<string,number>();
  expenses.forEach(t=>grouped.set(t.categoryId,(grouped.get(t.categoryId)??0)+Math.round(t.amount*100)));
  return [...grouped].map(([id,cents])=>{const category=categories.find(c=>c.id===id);return {id,name:category?.name??'Uncategorised',colour:category?.colour??'#83949b',amount:cents/100,percent:sum?Math.round(cents/sum):0};}).sort((a,b)=>b.amount-a.amount);
}
