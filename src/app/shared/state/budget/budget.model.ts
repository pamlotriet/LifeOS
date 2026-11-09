import { cycleStart, inCycle } from './budget-cycle';
export type TransactionType = 'expense' | 'income' | 'transfer' | 'spending-transfer';
export type CategoryType = 'expense' | 'income' | 'bills' | 'savings';
export function supportsPlan(type: CategoryType): boolean { return type === 'expense' || type === 'bills' || type === 'savings'; }
export interface BudgetCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  colour: string;
  order: number;
  deleted?: boolean;
}
export interface BudgetTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  title: string;
  date: string;
  paymentMethod: string;
  notes: string;
  receiptUrl: string;
  receiptPath: string;
  account?: string;
  debtId?: string;
  paymentStatus?: 'paid' | 'planned';
}
export type TransactionInput = Omit<BudgetTransaction, 'id'>;
export interface BudgetPlan { id: string; month: string; categoryId: string; amount: number; name?: string; }
export function categoryPlanItems(plans: BudgetPlan[], month: string, categoryId: string) {
  const items = plans.filter(plan => plan.month === month && plan.categoryId === categoryId);
  return { items, amount: items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100 };
}
export interface BudgetDebt {
  id: string;
  name: string;
  type: 'credit-card' | 'loan' | 'other';
  openingBalance: number;
  annualInterestRate: number;
  openingOverride: number | null;
}
export type BudgetDebtInput = Omit<BudgetDebt, 'id'>;
export function debtPlanId(month: string, debtId: string): string { return `debt-plan-${month}-${debtId}`; }
export const CATEGORY_TYPES: CategoryType[] = ['expense', 'income', 'bills', 'savings'];
export const CATEGORY_ICONS = ['restaurant-outline', 'home', 'car', 'wallet', 'heart', 'document-text', 'book', 'cash', 'card-outline', 'people', 'flash', 'disc'];
export const CATEGORY_COLOURS = ['#7f5d99', '#9e7eb5', '#c4a4da', '#4c2365', '#9e7eb5', '#7f5d99', '#c4a4da', '#4c2365'];
export const DEFAULT_CATEGORIES: BudgetCategory[] = [
  ['food', 'Food', 'expense', 'restaurant-outline', '#7f5d99'],
  ['home', 'Home', 'expense', 'home', '#9e7eb5'],
  ['transport', 'Transport', 'expense', 'car', '#c4a4da'],
  ['lifestyle', 'Lifestyle', 'expense', 'wallet', '#4c2365'],
  ['health', 'Health', 'expense', 'heart', '#9e7eb5'],
  ['entertainment', 'Entertainment', 'expense', 'disc', '#9e7eb5'],
  ['spending', 'Spending', 'expense', 'wallet', '#c4a4da'],
  ['other', 'Other', 'expense', 'document-text', '#7f5d99'],
  ['salary', 'Salary', 'income', 'cash', '#c4a4da'],
  ['other-income', 'Other income', 'income', 'wallet', '#9e7eb5'],
  ['utilities', 'Utilities', 'bills', 'flash', '#4c2365'],
  ['subscriptions', 'Subscriptions', 'bills', 'card-outline', '#7f5d99'],
  ['savings', 'Savings', 'savings', 'wallet', '#9e7eb5'],
].map(([id, name, type, icon, colour], order) => ({ id, name, type: type as CategoryType, icon, colour, order }));

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function money(value: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}
export function total(items: BudgetTransaction[]): number {
  return items.filter(item => item.paymentStatus !== 'planned').reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
}
export function compatibleCategory(type: TransactionType, category: CategoryType): boolean {
  return type === 'spending-transfer' ? category === 'expense' : type === 'income' ? category === 'income' : type === 'transfer' ? category === 'savings' : category === 'expense' || category === 'bills';
}
export function summary(items: BudgetTransaction[], categories: BudgetCategory[]) {
  const income = total(items.filter(x => x.type === 'income'));
  const expenses = total(items.filter(x => x.type === 'expense'));
  const bills = total(items.filter(x => x.type === 'expense' && categories.find(c => c.id === x.categoryId)?.type === 'bills'));
  const savings = total(items.filter(x => x.type === 'transfer'));
  return { income, expenses, bills, savings, remaining: Math.round((income - expenses - savings) * 100) / 100 };
}
export function debtSummary(debt: BudgetDebt, payments: BudgetTransaction[], month = localDate().slice(0, 7), startDay = 1) {
  const charges = payments.filter(item => item.account === `credit:${debt.id}` && item.type === 'expense');
  const linked = payments.filter(item => item.type === 'expense' && item.debtId === debt.id);
  const starting = debt.openingOverride ?? debt.openingBalance;
  const previousPaid = total(linked.filter(item => item.date < cycleStart(month, startDay)));
  const opening = Math.max(0, Math.round((starting + total(charges.filter(item => item.date < cycleStart(month, startDay))) - previousPaid) * 100) / 100);
  const interest = debt.type === 'credit-card' ? Math.round(opening * debt.annualInterestRate / 1200 * 100) / 100 : 0;
  const monthPaid = total(linked.filter(item => inCycle(item.date, month, startDay)));
  const paid = Math.round((previousPaid + monthPaid) * 100) / 100;
  const planned = linked.filter(item => item.paymentStatus === 'planned').reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
  const closing = Math.max(0, Math.round((opening + interest + total(charges.filter(item => inCycle(item.date, month, startDay))) - monthPaid) * 100) / 100);
  return { opening, interest, paid, monthPaid, planned, closing, projected: Math.max(0, Math.round((closing - planned) * 100) / 100) };
}
export function validateTransaction(input: TransactionInput): void {
  if (input.account && input.account !== 'savings' && !/^credit:[^/]{1,128}$/.test(input.account)) throw new Error('Choose a valid account.');
  if (input.account && input.type !== 'expense') throw new Error('Choose an account only for expenses.');
  if (input.account?.startsWith('credit:') && input.debtId) throw new Error('A credit card purchase cannot also be a debt repayment.');
  if (input.paymentStatus !== undefined && !['paid', 'planned'].includes(input.paymentStatus)) throw new Error('Choose paid or planned.');
  if (input.paymentStatus === 'planned' && (input.type !== 'expense' || !input.debtId)) throw new Error('A planned payment must belong to a debt.');
  if (input.debtId && input.type !== 'expense') throw new Error('Debt payments must be expenses.');
  if (input.debtId && input.paymentStatus !== 'planned' && input.date > localDate()) throw new Error('Use planned for a payment you have not made yet.');
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 999999999 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > .00001) throw new Error('Enter an amount greater than zero with up to two decimal places.');
  if (!['expense', 'income', 'transfer', 'spending-transfer'].includes(input.type)) throw new Error('Choose a transaction type.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new Error('Choose a valid date.');
  if (!input.title.trim() || input.title.length > 120) throw new Error('Enter a title of up to 120 characters.');
  if (!input.categoryId) throw new Error('Choose a category.');
  if (!['Card', 'Cash', 'Bank transfer', 'Debit order', 'Other'].includes(input.paymentMethod)) throw new Error('Choose a payment method.');
  if (input.notes.length > 2000) throw new Error('Keep notes under 2,000 characters.');
}

export function isSpendingCategory(category: BudgetCategory): boolean { return category.type === 'expense' && (category.id === 'spending' || category.name.trim().toLowerCase() === 'spending'); }

export interface SpendingBalanceCheckpoint { id: string; balance: number; recordedSpending: number; recordedFunding?: number; }

export interface SavingsBalance { balance: number; recordedNet: number; }
export function savingsNet(items: BudgetTransaction[]): number {
  return Math.round((total(items.filter(t => t.type === 'transfer')) - total(items.filter(t => t.type === 'expense' && t.account === 'savings'))) * 100) / 100;
}
