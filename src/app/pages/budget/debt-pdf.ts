import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { BudgetDebt, BudgetTransaction, money } from '../../shared/state/budget/budget.model';
import { debtReportData } from './debt-report';

export function createDebtPdf(debts: BudgetDebt[], transactions: BudgetTransaction[], month: string, startDay: number): jsPDF {
  const { cycle, rows } = debtReportData(debts, transactions, month, startDay);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `LifeOS Debt Report ${month}`, author: 'LifeOS' });
  const cash = (value: number) => money(value).replace(/\s/g, ' ');
  const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  let y = 20;
  const text = (value: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(value, 178);
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, 16, y); y += size * 0.45;
    }
    y += 3;
  };
  const table = (head: string[], body: string[][], moneyColumns: number[]) => {
    autoTable(doc, { startY: y, head: [head], body, margin: { left: 16, right: 16, top: 20, bottom: 20 },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, overflow: 'linebreak', textColor: [32, 43, 60] },
      headStyles: { fillColor: [52, 95, 168], textColor: 255 }, alternateRowStyles: { fillColor: [245, 246, 248] },
      columnStyles: Object.fromEntries(moneyColumns.map(index => [index, { halign: 'right' as const }])), rowPageBreak: 'avoid',
      didDrawPage: data => { y = data.cursor?.y ?? 20; },
    });
    y += 10;
  };
  const sum = (key: 'closing' | 'paid' | 'planned' | 'projected') => rows.reduce((sum, row) => sum + Math.round(row[key] * 100), 0) / 100;
  text('LIFEOS', 11, true);
  text('Debt & payment report', 22, true);
  text(`Budget cycle: ${date(cycle.start)} - ${date(cycle.end)}. All amounts in ZAR.`);
  table(['Remaining balances', 'Paid through cycle end', 'All planned payments', 'After plans'], [[cash(sum('closing')), cash(sum('paid')), cash(sum('planned')), cash(sum('projected'))]], [0, 1, 2, 3]);
  text('Accounts at a glance', 14, true);
  table(['Account', 'Remaining', 'Planned', 'After plans'], rows.map(row => [row.debt.name, cash(row.closing), cash(row.planned), cash(row.projected)]), [1, 2, 3]);
  for (const row of rows) {
    doc.addPage(); y = 20;
    text(row.debt.name, 18, true);
    text(row.debt.type === 'credit-card' ? 'Credit card' : row.debt.type === 'loan' ? 'Loan' : 'Other debt');
    table(['Balance details', 'Amount'], [
      ['Cycle opening balance', cash(row.opening)], ['Paid this cycle', cash(row.monthPaid)], ['Estimated cycle interest', cash(row.interest)],
      ['Remaining balance', cash(row.closing)], ['All planned payments', cash(row.planned)], ['After planned payments', cash(row.projected)],
    ], [1]);
    for (const [label, payments] of [[`Recorded payments through ${date(cycle.end)}`, row.history], ['Planned payments - all dates', row.upcoming]] as const) {
      if (y > 250) { doc.addPage(); y = 20; }
      text(label, 13, true);
      if (!payments.length) { text('No payments in this section.'); continue; }
      table(['Date', 'Description / notes', 'Method', 'Amount'], payments.map(item => [date(item.date), item.title + (item.notes ? `\n${item.notes}` : ''), item.paymentMethod, cash(item.amount)]), [3]);
      text(`Section total: ${cash(payments.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100)}`, 10, true);
    }
  }
  text('Balances reflect the selected cycle end. Planned payments include all dates and have not reduced actual balances. Projections assume all plans are paid and do not fall below zero. Credit card interest is estimated for this cycle only; prior interest and lender fees are excluded.', 9);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(97, 112, 133);
    doc.text(`LifeOS | ${month}`, 16, 287); doc.text(`Page ${page} of ${pages}`, 194, 287, { align: 'right' });
  }
  return doc;
}
