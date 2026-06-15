import { usePeriodContext } from '../../context/PeriodContext';
import { PeriodSelector } from '../ui/PeriodSelector';
import './TopBar.css';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { state, setSelectedPeriod } = usePeriodContext();

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        {title && <h1 className="topbar-title">{title}</h1>}
      </div>
      <div className="topbar-right">
        <span className="topbar-period-label">Period:</span>
        <PeriodSelector
          periods={state.periods}
          selected={state.selectedPeriod}
          onChange={setSelectedPeriod}
        />
      </div>
    </header>
  );
}
