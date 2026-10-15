import { cycleBounds } from '../../shared/state/budget/budget-cycle';
import { BudgetDebt, BudgetTransaction, debtSummary, money, total } from '../../shared/state/budget/budget.model';

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const date = (value: string): string => new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const amount = (value: number): string => escape(money(value));

export function debtReportData(debts: BudgetDebt[], transactions: BudgetTransaction[], month: string, startDay: number) {
  const cycle = cycleBounds(month, startDay);
  const rows = debts.map(debt => {
    const payments = transactions.filter(item => item.debtId === debt.id && item.type === 'expense');
    return { debt, ...debtSummary(debt, payments, month, startDay),
      history: payments.filter(item => item.paymentStatus !== 'planned' && item.date < cycle.endExclusive).sort((a, b) => a.date.localeCompare(b.date)),
      upcoming: payments.filter(item => item.paymentStatus === 'planned').sort((a, b) => a.date.localeCompare(b.date)) };
  });
  return { cycle, rows };
}

export function debtReportHtml(debts: BudgetDebt[], transactions: BudgetTransaction[], month: string, startDay: number): string {
  const { cycle, rows } = debtReportData(debts, transactions, month, startDay);
  const sum = (key: 'closing' | 'paid' | 'planned' | 'projected') => rows.reduce((value, row) => value + Math.round(row[key] * 100), 0) / 100;
  const paymentTable = (payments: BudgetTransaction[], planned: boolean): string => payments.length ? `<table><thead><tr><th>Date</th><th>Description / notes</th><th>Method</th><th class="number">Amount</th></tr></thead><tbody>${payments.map(item => `<tr><td class="date">${escape(date(item.date))}</td><td><strong>${escape(item.title)}</strong>${item.notes ? `<div class="notes">${escape(item.notes)}</div>` : ''}</td><td>${escape(item.paymentMethod)}</td><td class="number">${amount(item.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">${planned ? 'Total planned' : 'Total paid through cycle end'}</th><th class="number">${amount(planned ? payments.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100 : total(payments))}</th></tr></tfoot></table>` : `<p class="empty">No ${planned ? 'planned payments' : 'recorded payments through this cycle'}.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LifeOS Debt Report ${escape(month)}</title><style>
    @page { size:A4; margin:16mm 14mm; }
    * { box-sizing:border-box; } body { margin:0; color:#202b3c; background:#fff; font:12px/1.5 Arial,sans-serif; }
    main { max-width:1000px; margin:auto; padding:32px; } h1 { font-size:28px; margin:4px 0; } h2 { font-size:19px; margin:4px 0 16px; } h3 { font-size:13px; margin:22px 0 8px; }
    .brand { color:#345fa8; font-weight:bold; letter-spacing:2px; } .muted,.notes,.empty { color:#617085; } .notes { white-space:pre-wrap; font-size:11px; margin-top:4px; }
    .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:24px 0; } .summary>div,.metrics>div { border:1px solid #dce2e9; border-radius:8px; padding:12px; }
    .summary span,.metrics dt { display:block; color:#617085; font-size:10px; } .summary strong { display:block; margin-top:6px; font-size:18px; }
    .account { margin-top:30px; padding-top:20px; border-top:2px solid #345fa8; } .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:0; } .metrics dd { margin:4px 0 0; font-weight:bold; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:18px; } th,td { padding:9px 7px; text-align:left; border-bottom:1px solid #dce2e9; vertical-align:top; overflow-wrap:anywhere; }
    th { background:#eef1f5; font-size:10px; } th:first-child { width:18%; } th:nth-child(2) { width:43%; } th:nth-child(3) { width:19%; } th:last-child { width:20%; } .number { text-align:right; font-variant-numeric:tabular-nums; } tfoot th { background:#f5f6f8; }
    footer { border-top:1px solid #dce2e9; padding-top:12px; margin-top:30px; color:#617085; font-size:10px; } .tools { position:sticky; top:0; padding:14px 24px; background:#eef1f5; display:flex; align-items:center; flex-wrap:wrap; gap:16px; }
    button { border:0; border-radius:8px; padding:11px 18px; background:#345fa8; color:#fff; font:inherit; cursor:pointer; } button:focus-visible { outline:3px solid #345fa8; outline-offset:3px; }
    @media print { main { max-width:none; padding:0; } .tools { display:none; } thead { display:table-header-group; } tfoot { display:table-row-group; } tr,.summary,.metrics { break-inside:avoid; } h2,h3 { break-after:avoid; } body { font-size:10px; } .account { margin-top:24px; } .summary strong { font-size:15px; } }
    @media screen and (max-width:600px) { main { padding:16px; } .summary,.metrics { grid-template-columns:repeat(2,1fr); } }
  </style></head><body><div class="tools"><button type="button" id="save-pdf">Print / Save as PDF</button><span>Choose “Save as PDF” in the print destination.</span></div><main><header><div class="brand">LIFEOS</div><h1>Debt &amp; payment report</h1><p class="muted">Budget cycle: ${escape(date(cycle.start))} – ${escape(date(cycle.end))}<br>Balances at cycle end · All amounts in ZAR</p></header>
  <section class="summary" aria-label="Report totals"><div><span>Remaining balances</span><strong>${amount(sum('closing'))}</strong></div><div><span>Paid through cycle end</span><strong>${amount(sum('paid'))}</strong></div><div><span>All planned payments</span><strong>${amount(sum('planned'))}</strong></div><div><span>After planned payments</span><strong>${amount(sum('projected'))}</strong></div></section>
  <h2>Accounts at a glance</h2><table><thead><tr><th>Account</th><th class="number">Remaining</th><th class="number">Planned</th><th class="number">After plans</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escape(row.debt.name)}</td><td class="number">${amount(row.closing)}</td><td class="number">${amount(row.planned)}</td><td class="number">${amount(row.projected)}</td></tr>`).join('')}</tbody></table>
  ${rows.map(row => `<section class="account"><p class="muted">${row.debt.type === 'credit-card' ? 'Credit card' : row.debt.type === 'loan' ? 'Loan' : 'Other debt'}</p><h2>${escape(row.debt.name)}</h2><dl class="metrics"><div><dt>Cycle opening balance</dt><dd>${amount(row.opening)}</dd></div><div><dt>Paid this cycle</dt><dd>${amount(row.monthPaid)}</dd></div><div><dt>Estimated cycle interest</dt><dd>${amount(row.interest)}</dd></div><div><dt>Remaining balance</dt><dd>${amount(row.closing)}</dd></div><div><dt>All planned payments</dt><dd>${amount(row.planned)}</dd></div><div><dt>After planned payments</dt><dd>${amount(row.projected)}</dd></div></dl><h3>Recorded payments · through ${escape(date(cycle.end))}</h3>${paymentTable(row.history, false)}<h3>Planned payments · all dates</h3>${paymentTable(row.upcoming, true)}</section>`).join('')}
  <footer>Recorded payments include history through the selected cycle end. Planned payments include all dates and have not yet reduced balances. Projected balances assume every planned payment is made and do not fall below zero. Credit card balances include estimated interest for the selected cycle only; prior interest and lender fees are not calculated.</footer></main><script>document.getElementById('save-pdf').addEventListener('click',function(){window.print();});</script></body></html>`;
}
