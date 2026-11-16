import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { zipSync } from 'fflate';
import { budgetSnapshot } from '@pages/budget/budget-snapshot';
import { cycleBounds, inCycle } from '@pages/budget/state/cycle/budget-cycle';
import {
  BudgetCategory,
  BudgetDebt,
  BudgetPlan,
  BudgetTransaction,
  SpendingBalanceCheckpoint,
  debtSummary,
  isTransfer,
  isSpendingCategory,
  money,
  total,
  transferAccounts,
} from '@pages/budget/state/budget/budget.model';

export interface FinanceExportInput {
  month: string;
  startDay: number;
  transactions: BudgetTransaction[];
  categories: BudgetCategory[];
  plans: BudgetPlan[];
  debts: BudgetDebt[];
  checkpoints: SpendingBalanceCheckpoint[];
  accounts: Array<{ id: string; name: string; balance: number; basis: string }>;
}

export function financeExportData(input: FinanceExportInput) {
  const { month, startDay, transactions, categories, plans, debts } = input;
  const cycle = cycleBounds(month, startDay);
  const entries = transactions
    .filter((t) => inCycle(t.date, month, startDay))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
    );
  const snapshot = budgetSnapshot(
    transactions,
    categories,
    plans,
    month,
    startDay,
    input.checkpoints,
  );
  const debtBalances = debts.map((debt) => {
    const summary = debtSummary(debt, transactions, month, startDay);
    const planned =
      entries
        .filter(
          (t) => t.debtId === debt.id && t.type === 'expense' && t.paymentStatus === 'planned',
        )
        .reduce((sum, t) => sum + Math.round(t.amount * 100), 0) / 100;
    return {
      id: debt.id,
      name: debt.name,
      opening: summary.opening,
      paid: summary.monthPaid,
      interest: summary.interest,
      closing: summary.closing,
      planned,
    };
  });
  return {
    cycle,
    entries,
    snapshot,
    plans: plans.filter((p) => p.month === month),
    debtBalances,
    transferTotal: total(entries.filter(isTransfer)),
  };
}

/** Quote every cell and neutralize spreadsheet formulas in user-provided text. */
export function financeCsv(rows: Array<Array<string | number>>): string {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value);
            if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
          })
          .join(','),
      )
      .join('\r\n')
  );
}

export function createFinanceExport(input: FinanceExportInput): Uint8Array {
  const data = financeExportData(input);
  const category = (id: string) => input.categories.find((c) => c.id === id)?.name ?? id;
  const account = (id: string) =>
    input.accounts.find((a) => a.id === id)?.name ??
    input.debts.find((d) => `credit:${d.id}` === id)?.name ??
    id;
  const debt = (id?: string) => input.debts.find((d) => d.id === id)?.name ?? id ?? '';
  const transactionAccount = (t: BudgetTransaction) =>
    account(
      t.account ||
        (t.type === 'expense' &&
        !t.debtId &&
        input.categories.some((c) => c.id === t.categoryId && isSpendingCategory(c))
          ? 'spending'
          : 'main'),
    );
  const cash = (value: number) => money(value).replace(/\s/g, ' ');
  const doc = new jsPDF();
  doc.setProperties({ title: `LifeOS finances ${input.month}`, author: 'LifeOS' });
  let y = 20;
  const section = (title: string, head: string[], body: Array<Array<string | number>>) => {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(13);
    doc.text(title, 14, y);
    autoTable(doc, {
      startY: y + 5,
      head: [head],
      body: body.length ? body : [['No entries in this cycle']],
      margin: { top: 20, bottom: 20 },
      styles: { fontSize: 8, overflow: 'linebreak' },
      headStyles: { fillColor: [76, 35, 101] },
      rowPageBreak: 'avoid',
      didDrawPage: (event) => {
        y = (event.cursor?.y ?? 20) + 12;
      },
    });
  };
  doc.setFontSize(22);
  doc.text('Your cycle finances', 14, y);
  y += 9;
  doc.setFontSize(10);
  doc.text(`${data.cycle.start} to ${data.cycle.end} | ZAR`, 14, y);
  y += 12;
  section(
    'Cycle summary (paid entries)',
    ['Measure', 'Amount'],
    [
      ['Income', cash(data.snapshot.income)],
      ['Expenses (including debt payments)', cash(data.snapshot.expenses)],
      ['Debt payments (included in expenses)', cash(data.snapshot.debtPaid)],
      ['Transfers (separate from income / expenses)', cash(data.transferTotal)],
      ['Net savings transfers', cash(data.snapshot.savings)],
      ['Remaining after savings', cash(data.snapshot.remaining)],
      ['Budgeted total', cash(data.snapshot.plannedTotal)],
      ['Outstanding commitments', cash(data.snapshot.commitments)],
    ],
  );
  for (const planned of [false, true]) {
    section(
      planned ? 'Planned entries (not paid)' : 'Paid transactions and transfers',
      ['Date', 'Description / notes', 'Type / category', 'Account / route', 'Amount'],
      data.entries
        .filter((t) => (t.paymentStatus === 'planned') === planned)
        .map((t) => {
          const route = transferAccounts(t);
          return [
            t.date,
            `${t.title}${t.notes ? '\n' + t.notes : ''}${t.debtId ? '\nDebt: ' + debt(t.debtId) : ''}`,
            `${t.type}\n${category(t.categoryId)}`,
            route ? `${account(route.from)} -> ${account(route.to)}` : transactionAccount(t),
            cash(t.amount),
          ];
        }),
    );
  }
  section(
    'Category budgets',
    ['Category', 'Budget item', 'Planned amount'],
    data.plans.map((p) => [category(p.categoryId), p.name ?? '', cash(p.amount)]),
  );
  section(
    'Debt balances at cycle end',
    ['Debt', 'Opening', 'Paid', 'Est. interest', 'Closing', 'Cycle plans'],
    data.debtBalances.map((d) => [
      d.name,
      cash(d.opening),
      cash(d.paid),
      cash(d.interest),
      cash(d.closing),
      cash(d.planned),
    ]),
  );
  section(
    'Account balances (see basis)',
    ['Account', 'Balance', 'Basis'],
    input.accounts.map((a) => [a.name, cash(a.balance), a.basis]),
  );
  section(
    'Report notes',
    ['Details'],
    [
      [
        'Current account balances are not historical cycle-end balances. Spending uses the selected cycle calculation.',
      ],
      [
        'Debt opening balances include earlier recorded payments. Only payments and plans within the selected cycle appear in the transaction lists.',
      ],
      [
        'Credit card interest is estimated for this cycle only; prior interest and lender fees are excluded. Receipt links are in the CSV; receipt files are not embedded.',
      ],
    ],
  );
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text(`LifeOS | ${input.month} | ${page} / ${doc.getNumberOfPages()}`, 14, 288);
  }
  const csv = financeCsv([
    [
      'Date',
      'Title',
      'Type',
      'Status',
      'Category',
      'Amount ZAR',
      'Account',
      'From account',
      'To account',
      'Debt',
      'Payment method',
      'Notes',
      'Receipt URL',
      'ID',
    ],
    ...data.entries.map((t) => {
      const route = transferAccounts(t);
      return [
        t.date,
        t.title,
        t.type,
        t.paymentStatus ?? 'paid',
        category(t.categoryId),
        t.amount,
        route ? '' : transactionAccount(t),
        route ? account(route.from) : '',
        route ? account(route.to) : '',
        debt(t.debtId),
        t.paymentMethod,
        t.notes,
        t.receiptUrl,
        t.id,
      ];
    }),
  ]);
  const encode = (text: string) => new Uint8Array(new TextEncoder().encode(text));
  return zipSync({
    'Finances.pdf': new Uint8Array(doc.output('arraybuffer')),
    'Transactions.csv': encode(csv),
    'Cycle-data.json': encode(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          month: input.month,
          ...data,
          categories: input.categories,
          accounts: input.accounts,
        },
        null,
        2,
      ),
    ),
  });
}
