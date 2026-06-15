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
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      onChange(null);
      return;
    }
    const found = periods.find((p) => p.id === val);
    onChange(found ?? null);
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
        {sorted.map((p) => (
          <option key={p.id} value={p.id}>
            {p.month} {p.year}
            {p.row_count !== null ? ` (${p.row_count.toLocaleString()} rows)` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
