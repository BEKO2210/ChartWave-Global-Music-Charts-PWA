import { getCollection } from 'astro:content';
import type { Chart, ChartType } from '../content/config';

export async function getAllCharts(): Promise<Chart[]> {
  const entries = await getCollection('charts');
  return entries.map((e) => e.data as unknown as Chart);
}

export async function getChart(slug: string): Promise<Chart | undefined> {
  const charts = await getAllCharts();
  return charts.find((c) => c.slug === slug);
}

export async function getChartsByType(type: ChartType): Promise<Chart[]> {
  const charts = await getAllCharts();
  return charts.filter((c) => c.type === type);
}

export function getCountryFlag(code: string): string {
  const offset = 0x1f1e6;
  const chars = code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + offset));
  return chars.join('');
}

export function getGenreColor(genreColor?: string): string {
  if (!genreColor) return '#6366f1';
  const colorMap: Record<string, string> = {
    '--genre-pop': '#ec4899',
    '--genre-hiphop': '#f59e0b',
    '--genre-rock': '#ef4444',
    '--genre-electronic': '#06b6d4',
    '--genre-rnb': '#a855f7',
    '--genre-indie': '#84cc16',
    '--genre-metal': '#dc2626',
    '--genre-jazz': '#d97706',
    '--genre-classical': '#64748b',
    '--genre-kpop': '#f472b6',
    '--genre-latin': '#10b981',
    '--genre-country': '#78716c',
    '--genre-deutschrap': '#3b82f6',
  };
  return colorMap[genreColor] ?? '#6366f1';
}
