import type { Period } from '../../types';
import './PeriodSelector.css';

interface PeriodSelectorProps {
  periods: Period[];
  selected: Period | null;
  onChange: (period: Period | null) => void;
}

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function PeriodSelector({ periods, selected, onChange }: PeriodSelectorProps) {
  // Generate YTD periods for each unique year present in the uploads
  const years = Array.from(new Set(periods.map((p) => p.year))).sort((a, b) => b - a);
  const ytdPeriods = years.map((yr) => ({
    id: `YTD_${yr}`,
    month: 'YTD',
    year: yr,
    uploaded_at: '',
    row_count: periods
      .filter((p) => p.year === yr)
      .reduce((sum, p) => sum + (p.row_count ?? 0), 0),
  }));

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      onChange(null);
      return;
    }
    if (val.startsWith('YTD_')) {
      const found = ytdPeriods.find((p) => p.id === val);
      onChange(found ?? null);
    } else {
      const found = periods.find((p) => p.id === val);
      onChange(found ?? null);
    }
  }

  // Sort and deduplicate periods by year desc, month desc, prioritizing those with row counts
  const seen = new Set<string>();
  const sorted = [...periods]
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const countA = a.row_count ?? 0;
      const countB = b.row_count ?? 0;
      if (countB !== countA) return countB - countA;
      return MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month);
    })
    .filter((p) => {
      const key = `${p.month}-${p.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return (
    <div className="period-selector">
      <select
        id="period-selector"
        className="input select period-selector-input"
        value={selected?.id ?? ''}
        onChange={handleChange}
        aria-label="Select reporting period"
      >
        <option value="">Select period...</option>
        {ytdPeriods.length > 0 && (
          <optgroup label="Year-to-Date (YTD)">
            {ytdPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                YTD {p.year} ({p.row_count.toLocaleString()} rows)
              </option>
            ))}
          </optgroup>
        )}
        {sorted.length > 0 && (
          <optgroup label="Monthly Periods">
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>
                {p.month} {p.year}
                {p.row_count !== null ? ` (${p.row_count.toLocaleString()} rows)` : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
