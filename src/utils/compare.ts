import type { Period } from '../types';

export const MONTHS: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

/**
 * Finds the chronologically previous period in the periods list.
 */
export function getPreviousPeriod(selectedPeriod: Period | null, periods: Period[]): Period | null {
  if (!selectedPeriod || periods.length <= 1) return null;
  const sorted = [...periods].sort((a, b) => {
    const aMonth = MONTHS[a.month] ?? 0;
    const bMonth = MONTHS[b.month] ?? 0;
    if (a.year !== b.year) return a.year - b.year;
    return aMonth - bMonth;
  });
  const idx = sorted.findIndex((p) => p.id === selectedPeriod.id);
  return idx > 0 ? sorted[idx - 1] : null;
}

/**
 * Calculates percentage or rate differences and returns KpiCard compatible subtitle and trend.
 */
export function getCompareDetails(curr: number, prev: number | undefined | null, isRate = false) {
  if (prev === undefined || prev === null || isNaN(prev) || isNaN(curr)) {
    return { subtitle: 'vs last period: N/A', trend: 'neutral' as const };
  }
  if (isRate) {
    const diff = curr - prev;
    const sign = diff > 0 ? '+' : '';
    const trend = diff > 0.01 ? ('up' as const) : diff < -0.01 ? ('down' as const) : ('neutral' as const);
    return {
      subtitle: `${sign}${diff.toFixed(1)}% vs last period`,
      trend,
    };
  }
  if (prev === 0) {
    if (curr === 0) {
      return { subtitle: '0.0% vs last period', trend: 'neutral' as const };
    }
    return { subtitle: '+100.0% vs last period', trend: 'up' as const };
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const sign = pct > 0 ? '+' : '';
  const trend = pct > 0.01 ? ('up' as const) : pct < -0.01 ? ('down' as const) : ('neutral' as const);
  return {
    subtitle: `${sign}${pct.toFixed(1)}% vs last period`,
    trend,
  };
}
