import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

/** Chart palette */
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#64748B',
];

interface BarDataPoint {
  name: string;
  [key: string]: string | number;
}

interface BarSeries {
  key: string;
  label: string;
  color?: string;
}

interface BarChartProps {
  data: BarDataPoint[];
  series?: BarSeries[];
  /** If no series given, use this single data key */
  dataKey?: string;
  loading?: boolean;
  emptyMessage?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  formatter?: (value: number) => string;
  showLabels?: boolean;
  colorEachBar?: boolean;
  onBarClick?: (name: string) => void;
}

export function BarChart({
  data,
  series,
  dataKey = 'value',
  loading = false,
  emptyMessage = 'No data available',
  height = 300,
  layout = 'horizontal',
  formatter,
  showLabels = false,
  colorEachBar = false,
  onBarClick,
}: BarChartProps) {
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
        <span className="empty-state-icon">📊</span>
        <p className="empty-state-title">{emptyMessage}</p>
      </div>
    );
  }

  const tooltipStyle = {
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-md)',
    fontSize: 13,
  };

  const tickStyle = {
    fontSize: 12,
    fill: '#475569',
    fontFamily: 'Inter, sans-serif',
  };

  function fmt(val: unknown): string {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return String(val);
    return formatter ? formatter(num) : num.toLocaleString('en-IN');
  }

  if (layout === 'vertical') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" tick={tickStyle} tickFormatter={fmt} />
          <YAxis dataKey="name" type="category" tick={tickStyle} width={120} />
          <Tooltip
            formatter={(val: any) => fmt(val)}
            contentStyle={tooltipStyle}
          />
          <Bar
            dataKey={dataKey}
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={800}
            onClick={(d: any) => onBarClick?.(d.name)}
            cursor={onBarClick ? 'pointer' : 'default'}
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={colorEachBar ? COLORS[index % COLORS.length] : COLORS[0]} />
            ))}
            {showLabels && (
              <LabelList
                dataKey={dataKey}
                position="right"
                style={{ fontSize: 11, fill: '#475569' }}
                formatter={(val: any) => fmt(val)}
              />
            )}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
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
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color ?? COLORS[si % COLORS.length]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={800}
              />
            ))}
          </>
        ) : (
          <Bar
            dataKey={dataKey}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
            onClick={(d: any) => onBarClick?.(d.name)}
            cursor={onBarClick ? 'pointer' : 'default'}
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={colorEachBar ? COLORS[index % COLORS.length] : COLORS[0]} />
            ))}
          </Bar>
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
