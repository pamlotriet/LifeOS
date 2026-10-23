import { ChartConfiguration } from 'chart.js';
import { BookRecord, effectiveTotalPages } from '../books/book.model';
import type { StatsDashboard, StatsRange } from './stats.service';
import { statsAnchor, statsMonths } from './stats.calculations';

interface Row {
  label: string;
  value: number;
  percent: number;
  color: string;
}
export interface BookStatsDetail {
  cards: { label: string; value: string; unit: string; note: string; icon: string }[];
  pages: ChartConfiguration;
  authors: Row[];
  ratings: Row[];
  categories: Row[];
  formats: Row[];
  totalFinished: number;
  totalPages: string;
  bestMonth: string;
  bestCount: number;
  streak: number;
  insights: string[];
}
const colors = ['#9b87ff', '#c4b5fd', '#a5b4fc', '#f0abfc', '#5eead4', '#b6b4c8'];
export function buildBookStats(
  books: BookRecord[],
  range: StatsRange,
  selectedMonth?: string,
  now = new Date(),
): StatsDashboard {
  const months = statsMonths(range, statsAnchor(range, selectedMonth, now));
  const completed = books.filter((b) => b.status === 'Finished');
  const finished = completed.filter(
    (b) => range === 'All' || months.includes(b.finishDate?.slice(0, 7)),
  );
  const dated = finished.filter((b) => b.finishDate);
  const counts = months.map((m) => dated.filter((b) => b.finishDate.startsWith(m)).length);
  const pages = months.map((m) =>
    dated
      .filter((b) => b.finishDate.startsWith(m))
      .reduce((n, b) => n + (effectiveTotalPages(b) || 0), 0),
  );
  const totalPages = finished.reduce((n, b) => n + (effectiveTotalPages(b) || 0), 0);
  const rows = (values: string[]): Row[] => {
    const tally = new Map<string, number>();
    values.forEach((v) =>
      tally.set(v || 'Uncategorised', (tally.get(v || 'Uncategorised') || 0) + 1),
    );
    return [...tally]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percent: values.length ? Math.round((value / values.length) * 100) : 0,
        color: colors[i % colors.length],
      }));
  };
  const authors = rows(finished.map((b) => b.author)).slice(0, 6);
  const categories = rows(finished.map((b) => b.category));
  const formats = rows(
    books.flatMap((b) =>
      (b.copies ?? []).map((c) =>
        c.format === 'Paperback' || c.format === 'Hardcover'
          ? 'Physical'
          : c.format === 'Audiobook'
            ? 'Audio'
            : c.format,
      ),
    ),
  );
  const ratings = [5, 4, 3, 2, 1].map((value) => ({
    label: `${value}\u2605`,
    value: finished.filter((b) => Math.round(b.rating) === value).length,
    percent: 0,
    color: '#f0abfc',
  }));
  const durations = finished
    .filter((b) => b.startDate && b.finishDate && b.finishDate >= b.startDate)
    .map((b) =>
      Math.max(
        1,
        Math.ceil((new Date(b.finishDate).getTime() - new Date(b.startDate).getTime()) / 86400000),
      ),
    );
  const bestIndex = counts.indexOf(Math.max(...counts));
  const monthLabels = months.map((m) =>
    new Date(m + '-01T12:00:00').toLocaleDateString('en-ZA', { month: 'short' }),
  );
  const bestCount = counts[bestIndex] || 0;
  const days = [...new Set(dated.map((b) => b.finishDate))].sort();
  let streak = 0,
    current = 0,
    previous = '';
  for (const day of days) {
    current =
      previous && (new Date(day).getTime() - new Date(previous).getTime()) / 86400000 === 1
        ? current + 1
        : 1;
    streak = Math.max(streak, current);
    previous = day;
  }
  const options: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#b8c3ed', maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: { display: false },
        grid: { color: '#2d273e' },
      },
    },
  };
  const primary: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Books finished',
          data: counts,
          backgroundColor: '#9080e8',
          borderRadius: 5,
          maxBarThickness: 62,
        },
      ],
    },
    options,
  };
  const secondary: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels: categories.map((r) => r.label),
      datasets: [
        {
          data: categories.map((r) => r.value),
          backgroundColor: categories.map((r) => r.color),
          borderColor: '#161225',
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } },
    } as ChartConfiguration['options'],
  };
  const reading = books.filter((b) => b.status === 'Reading');
  const yearCount = completed.filter((b) =>
    b.finishDate
      ? b.finishDate.startsWith(String(now.getFullYear()))
      : b.yearRead === now.getFullYear(),
  ).length;
  const insights = [
    bestCount
      ? `Best stretch: ${monthLabels[bestIndex]} with ${bestCount} books finished.`
      : 'Finish a book to start your monthly reading story.',
    finished.length
      ? `You read ${Math.round(totalPages / finished.length).toLocaleString('en-US')} pages per finished book on average.`
      : 'Your average book length will appear here.',
    categories.length
      ? `${categories[0].label} leads your reading with ${categories[0].value} finished books.`
      : 'Your finished books will reveal your favourite categories.',
    `${reading.length} book${reading.length === 1 ? '' : 's'} currently in progress. Keep your next chapter going.`,
  ];
  return {
    empty: !books.length,
    emptyTitle: 'No reading stats yet',
    emptyMessage: 'Add books and update their reading status to see your trends.',
    action: '/books/add',
    kpis: [],
    primary,
    secondary,
    primaryTitle: 'Books read by month',
    secondaryTitle: 'Books by category',
    insight: insights[0],
    books: {
      cards: [
        {
          label: 'Total books',
          value: String(books.length),
          unit: '',
          note: 'Collected so far',
          icon: 'book-outline',
        },
        {
          label: 'Read this year',
          value: String(yearCount),
          unit: 'books',
          note: String(now.getFullYear()) + ' finished reads',
          icon: 'checkmark-done-outline',
        },
        {
          label: 'Currently reading',
          value: String(reading.length),
          unit: 'books',
          note:
            reading.reduce((n, b) => n + (b.pageProgress || 0), 0).toLocaleString('en-US') +
            ' pages in',
          icon: 'book-outline',
        },
        {
          label: 'Favourites',
          value: String(books.filter((b) => b.favourite).length),
          unit: '',
          note: 'Across your collection',
          icon: 'bookmark-outline',
        },
        {
          label: 'Pages read',
          value: totalPages.toLocaleString('en-US'),
          unit: 'pages',
          note: 'Finished books \u00b7 ' + range,
          icon: 'reader-outline',
        },
        {
          label: 'Avg pace',
          value: durations.length
            ? String(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length))
            : '\u2014',
          unit: 'days / book',
          note: 'From recorded reading dates',
          icon: 'time-outline',
        },
      ],
      pages: {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Pages in finished books',
              data: pages,
              borderColor: '#5eead4',
              backgroundColor: '#5eead420',
              fill: true,
              pointRadius: 0,
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          ...options,
          scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
        },
      },
      authors,
      ratings,
      categories,
      formats,
      totalFinished: finished.length,
      totalPages: totalPages.toLocaleString('en-US'),
      bestMonth: bestCount ? monthLabels[bestIndex] : '\u2014',
      bestCount,
      streak,
      insights,
    },
  };
}
