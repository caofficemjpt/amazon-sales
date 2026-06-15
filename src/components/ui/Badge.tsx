import './Badge.css';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

/** Maps transaction types to badge variants */
const TRANSACTION_BADGE_MAP: Record<string, BadgeVariant> = {
  Shipment: 'success',
  Refund: 'danger',
  FreeReplacement: 'warning',
  Cancel: 'neutral',
};

export function Badge({ label, variant }: BadgeProps) {
  const resolvedVariant = variant ?? TRANSACTION_BADGE_MAP[label] ?? 'default';

  return (
    <span className={`badge badge--${resolvedVariant}`}>
      {label}
    </span>
  );
}
