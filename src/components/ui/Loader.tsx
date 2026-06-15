import './Loader.css';

interface LoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loader({ message = 'Loading...', size = 'md' }: LoaderProps) {
  return (
    <div className={`loader loader--${size}`} role="status" aria-label={message}>
      <div className="loader-spinner" aria-hidden="true">
        <div className="loader-spinner-ring" />
      </div>
      {message && <p className="loader-message">{message}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Loader size="lg" message="Loading data..." />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-value" />
      <div className="skeleton skeleton-subtitle" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-cell" style={{ width: '15%' }} />
          <div className="skeleton skeleton-cell" style={{ width: '25%' }} />
          <div className="skeleton skeleton-cell" style={{ width: '20%' }} />
          <div className="skeleton skeleton-cell" style={{ width: '15%' }} />
          <div className="skeleton skeleton-cell" style={{ width: '15%' }} />
        </div>
      ))}
    </div>
  );
}
