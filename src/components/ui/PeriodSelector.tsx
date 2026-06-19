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
  // Sort and deduplicate periods chronologically
  const seen = new Set<string>();
  const chronoPeriods = [...periods]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month);
    })
    .filter((p) => {
      const key = `${p.month}-${p.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const years = Array.from(new Set(chronoPeriods.map((p) => p.year))).sort((a, b) => b - a);
  const ytdPeriods = years.map((yr) => ({
    id: `YTD_${yr}`,
    month: 'YTD',
    year: yr,
    uploaded_at: '',
    row_count: chronoPeriods
      .filter((p) => p.year === yr)
      .reduce((sum, p) => sum + (p.row_count ?? 0), 0),
  }));

  let fromId = '';
  let toId = '';

  if (selected?.id.startsWith('MULTI_')) {
    const ids = selected.id.replace('MULTI_', '').split(',');
    fromId = ids[0];
    toId = ids[ids.length - 1];
  } else if (selected?.id && !selected.id.startsWith('YTD_')) {
    fromId = selected.id;
    toId = selected.id;
  }

  function handleRangeChange(type: 'from' | 'to', value: string) {
    let newFrom = type === 'from' ? value : fromId;
    let newTo = type === 'to' ? value : toId;

    if (!newFrom && !newTo) {
      onChange(null);
      return;
    }
    if (newFrom && !newTo) newTo = newFrom;
    if (newTo && !newFrom) newFrom = newTo;

    const idxFrom = chronoPeriods.findIndex((p) => p.id === newFrom);
    const idxTo = chronoPeriods.findIndex((p) => p.id === newTo);

    if (idxFrom === -1 || idxTo === -1) return;

    const startIdx = Math.min(idxFrom, idxTo);
    const endIdx = Math.max(idxFrom, idxTo);

    const selectedSlice = chronoPeriods.slice(startIdx, endIdx + 1);
    
    if (selectedSlice.length === 1) {
      onChange(selectedSlice[0]);
    } else {
      const ids = selectedSlice.map((p) => p.id).join(',');
      const multiPeriod: any = {
        id: `MULTI_${ids}`,
        month: `${selectedSlice[0].month} - ${selectedSlice[selectedSlice.length - 1].month}`,
        year: selectedSlice[0].year === selectedSlice[selectedSlice.length - 1].year 
          ? selectedSlice[0].year 
          : 'Multiple',
        uploaded_at: new Date().toISOString(),
        row_count: selectedSlice.reduce((sum, p) => sum + (p.row_count ?? 0), 0),
      };
      onChange(multiPeriod);
    }
  }

  return (
    <div className="period-selector">
      <div className="period-shortcuts">
        {ytdPeriods.map((p) => (
          <button
            key={p.id}
            className={`shortcut-btn ${selected?.id === p.id ? 'active' : ''}`}
            onClick={() => onChange(p as any)}
            aria-label={`Select YTD for ${p.year}`}
          >
            YTD {p.year}
          </button>
        ))}
      </div>
      <div className="period-range">
        <select
          className="input select period-select"
          value={fromId}
          onChange={(e) => handleRangeChange('from', e.target.value)}
          aria-label="Start period"
        >
          <option value="">Start Period...</option>
          {chronoPeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.month} {p.year}
            </option>
          ))}
        </select>
        <span className="period-separator">to</span>
        <select
          className="input select period-select"
          value={toId}
          onChange={(e) => handleRangeChange('to', e.target.value)}
          aria-label="End period"
        >
          <option value="">End Period...</option>
          {chronoPeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.month} {p.year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
