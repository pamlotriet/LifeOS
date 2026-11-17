import type { BookStatsDetail } from '@pages/statistics/state/books/book-stats';
import type { ChartConfiguration } from 'chart.js';
export type StatsModule = 'fuel' | 'books' | 'budget';
export type StatsRange = '1M' | '3M' | '6M' | '1Y' | 'All';
export interface StatsModuleOption {
  id: StatsModule;
  label: string;
  icon: string;
}
export interface StatsKpi {
  label: string;
  value: string;
  icon: string;
  accent: string;
}
export interface StatsDashboard {
  books?: BookStatsDetail;
  spending?: Array<{
    id: string;
    name: string;
    colour: string;
    amount: number;
    percent: number;
    formatted: string;
  }>;
  debt?: {
    kpis: StatsKpi[];
    balances: ChartConfiguration;
    repayments: ChartConfiguration;
    empty: boolean;
    cycleLabel: string;
  };
  kpis: StatsKpi[];
  primary: ChartConfiguration;
  secondary: ChartConfiguration;
  primaryTitle: string;
  secondaryTitle: string;
  insight: string;
  empty: boolean;
  emptyTitle: string;
  emptyMessage: string;
  action?: string;
}

export const STATS_MODULES: StatsModuleOption[] = [
  { id: 'fuel', label: 'Fuel', icon: 'car-sport-outline' },
  { id: 'books', label: 'Books', icon: 'book' },
  { id: 'budget', label: 'Budget', icon: 'wallet' },
];
