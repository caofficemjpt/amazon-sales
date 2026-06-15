import type { ReactNode } from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import type { KpiColor, Trend } from '../../types';
import { ArrowUpRight, ArrowDownRight, Equal } from 'lucide-react';
import './KpiCard.css';

interface KpiCardProps {
  title: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  trend?: Trend;
  color?: KpiColor;
  icon?: ReactNode;
}

const TREND_ICONS: Record<Trend, ReactNode> = {
  up: <ArrowUpRight size={16} />,
  down: <ArrowDownRight size={16} />,
  neutral: <Equal size={16} />,
};

const TREND_LABELS: Record<Trend, string> = {
  up: 'trending up',
  down: 'trending down',
  neutral: 'stable',
};

export function KpiCard({
  title,
  value,
  rawValue,
  subtitle = 'vs last period: N/A',
  trend = 'neutral',
  color = 'default',
  icon,
}: KpiCardProps) {
  // Animate the numeric portion if rawValue is provided
  const animatedValue = useCountUp(rawValue ?? 0);
  const displayValue = rawValue !== undefined
    ? formatAnimatedValue(animatedValue, value)
    : value;

  return (
    <div className={`kpi-card kpi-card--${color}`} role="figure" aria-label={`${title}: ${value}`}>
      {icon && (
        <div className="kpi-card-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
        </div>
      )}
      <div className="kpi-card-body">
        <p className="kpi-card-title">{title}</p>
        <p className="kpi-card-value">{displayValue}</p>
        <div className="kpi-card-footer">
          {trend !== 'neutral' && (
            <span
              className={`kpi-card-trend kpi-card-trend--${trend}`}
              aria-label={TREND_LABELS[trend]}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              {TREND_ICONS[trend]}
            </span>
          )}
          <span className="kpi-card-subtitle">{subtitle}</span>
        </div>
      </div>
    </div>
  );
}

/** Attempts to animate the numeric portion of a formatted value string */
function formatAnimatedValue(animatedRaw: number, originalValue: string): string {
  // If the original value ends with %, format as percentage
  if (originalValue.endsWith('%')) {
    return `${animatedRaw.toFixed(1)}%`;
  }
  // If original has ₹, format as currency
  if (originalValue.includes('₹') || originalValue.includes('INR')) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(animatedRaw);
  }
  // Otherwise just format as integer
  return Math.round(animatedRaw).toLocaleString('en-IN');
}
