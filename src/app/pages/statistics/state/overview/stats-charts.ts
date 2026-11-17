import { money } from '@pages/budget/state/budget/budget.model';
import type { StatsKpi } from '@pages/statistics/state/overview/stats.model';
import type { ChartConfiguration } from 'chart.js';
export const chartOptions = (currency = false): ChartConfiguration['options'] => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { labels: { color: '#9e7eb5', usePointStyle: true, boxWidth: 8 } },
    tooltip: {
      callbacks: {
        label: (c) =>
          `${c.dataset.label}: ${currency ? money(Number(c.raw)) : Number(c.raw).toFixed(1)}`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#9e7eb5' }, grid: { color: '#7f5d9955' }, border: { color: '#7f5d99' } },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#9e7eb5',
        callback: currency ? (value) => `R${Number(value).toLocaleString('en-ZA')}` : undefined,
      },
      grid: { color: '#7f5d9955' },
      border: { color: '#7f5d99' },
    },
  },
});
export const labels = (values: string[]) =>
  values.map((value) =>
    new Date(`${value}-01T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' }),
  );

export function kpi(label: string, value: string, icon: string, accent: string): StatsKpi {
  return { label, value, icon, accent };
}
