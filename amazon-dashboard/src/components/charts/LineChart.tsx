import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/** Chart palette */
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#64748B',
];

interface LineDataPoint {
  name: string;
  [key: string]: string | number;
}

interface LineSeries {
  key: string;
  label: string;
  color?: string;
}

interface LineChartProps {
  data: LineDataPoint[];
  series?: LineSeries[];
  dataKey?: string;
  loading?: boolean;
  emptyMessage?: string;
  height?: number;
  formatter?: (value: number) => string;
}

export function LineChart({
  data,
  series,
  dataKey = 'value',
  loading = false,
  emptyMessage = 'No data available',
  height = 300,
  formatter,
}: LineChartProps) {
  if (loading) {
    return (
      <div
        className="skeleton"
        style={{ height, borderRadius: 'var(--radius-lg)' }}
        role="status"
        aria-label="Loading chart"
      />
    );
  }

  if (!data.length) {
    return (
      <div className="empty-state" style={{ height }}>
        <span className="empty-state-icon">📈</span>
        <p className="empty-state-title">{emptyMessage}</p>
      </div>
    );
  }

  const tickStyle = {
    fontSize: 12,
    fill: '#475569',
    fontFamily: 'Inter, sans-serif',
  };

  const tooltipStyle = {
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-md)',
    fontSize: 13,
  };

  function fmt(val: unknown): string {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return String(val);
    return formatter ? formatter(num) : num.toLocaleString('en-IN');
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="name" tick={tickStyle} />
        <YAxis tick={tickStyle} tickFormatter={fmt} />
        <Tooltip
          formatter={(val: any) => fmt(val)}
          contentStyle={tooltipStyle}
        />
        {series ? (
          <>
            <Legend wrapperStyle={{ fontSize: 13 }} />
            {series.map((s, si) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? COLORS[si % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={800}
              />
            ))}
          </>
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
            animationDuration={800}
          />
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
