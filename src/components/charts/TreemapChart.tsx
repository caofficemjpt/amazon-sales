import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/** Chart palette */
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#64748B',
  '#1D4ED8', '#059669', '#B45309', '#B91C1C',
];

interface TreemapDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface TreemapChartProps {
  data: TreemapDataPoint[];
  loading?: boolean;
  emptyMessage?: string;
  height?: number;
  formatter?: (value: number) => string;
}

interface CustomContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  index?: number;
}

function CustomContent({ x = 0, y = 0, width = 0, height = 0, name = '', value = 0, index = 0 }: CustomContentProps) {
  const color = COLORS[index % COLORS.length];
  const fontSize = Math.min(13, width / 8);
  if (width < 40 || height < 30) return null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={4} ry={4} />
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={color} fillOpacity={0.9} rx={3} ry={3} />
      {height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2 - 8}
          textAnchor="middle"
          fill="#fff"
          fontSize={fontSize}
          fontWeight={600}
          fontFamily="Inter, sans-serif"
        >
          {name.length > 20 ? name.substring(0, 18) + '…' : name}
        </text>
      )}
      <text
        x={x + width / 2}
        y={y + height / 2 + (height > 40 ? 10 : 0)}
        textAnchor="middle"
        fill="rgba(255,255,255,0.85)"
        fontSize={Math.min(11, width / 9)}
        fontFamily="Inter, sans-serif"
      >
        {Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </text>
    </g>
  );
}

export function TreemapChart({
  data,
  loading = false,
  emptyMessage = 'No data available',
  height = 400,
  formatter,
}: TreemapChartProps) {
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
        <span className="empty-state-icon">🗂️</span>
        <p className="empty-state-title">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={data}
        dataKey="value"
        aspectRatio={4 / 3}
        isAnimationActive={true}
        animationDuration={800}
        content={<CustomContent />}
      >
        <Tooltip
          formatter={(val: any) =>
            formatter ? formatter(Number(val)) : val.toLocaleString('en-IN')
          }
          contentStyle={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
            fontSize: 13,
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
