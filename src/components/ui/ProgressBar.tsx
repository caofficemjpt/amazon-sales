import './ProgressBar.css';

interface ProgressBarProps {
  percent: number;
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({ percent, label, showPercent = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="progress-bar-wrapper">
      {label && (
        <div className="progress-bar-header">
          <span className="progress-bar-label">{label}</span>
          {showPercent && (
            <span className="progress-bar-percent">{Math.round(clamped)}%</span>
          )}
        </div>
      )}
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
