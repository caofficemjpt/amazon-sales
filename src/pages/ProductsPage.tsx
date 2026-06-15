import { useMemo, useState } from 'react';
import { usePeriodContext } from '../context/PeriodContext';
import { useRecords } from '../hooks/useRecords';
import { useFees } from '../hooks/useFees';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { KpiCard } from '../components/ui/KpiCard';
import { PageLoader } from '../components/ui/Loader';
import type { ConsolidatedRecord, SettlementFee } from '../types';
import { formatINR, formatPct, formatDateTime } from '../utils/format';
import { getPreviousPeriod, getCompareDetails } from '../utils/compare';
import {
  Lightbulb,
  Megaphone,
  TrendingUp,
  Tag,
  BarChart3,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import './ProductsPage.css';

const SHIPMENT = 'Shipment';
const RTO_TYPES = ['FreeReplacement', 'Cancel'];

/** Top-N count for charts */
const TOP_N = 10;

interface SkuMetric {
  sku: string;
  description: string;
  unitsSold: number;
  revenue: number;
  refunds: number;
  refundRate: number;
  totalCharges: number;
  netReceived: number;
  rtoCount: number;
  profitabilityScore: number;
}

export function ProductsPage() {
  const { state } = usePeriodContext();
  const { records, loading: recLoading } = useRecords(state.selectedPeriod?.id ?? null);
  const { fees, loading: feeLoading } = useFees(state.selectedPeriod?.id ?? null);

  // Load previous period records for period-over-period comparison
  const previousPeriod = useMemo(() => {
    return getPreviousPeriod(state.selectedPeriod, state.periods);
  }, [state.selectedPeriod, state.periods]);

  const { records: prevRecords } = useRecords(previousPeriod?.id ?? null);
  const { fees: prevFees } = useFees(previousPeriod?.id ?? null);

  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const loading = recLoading || feeLoading;

  const skuMetrics = useMemo(() => computeSkuMetrics(records), [records]);
  const prevSkuMetrics = useMemo(() => computeSkuMetrics(prevRecords), [prevRecords]);

  const topSkusByUnits = useMemo(
    () => skuMetrics.slice().sort((a, b) => b.unitsSold - a.unitsSold).slice(0, TOP_N),
    [skuMetrics]
  );
  const topSkusByRto = useMemo(
    () => skuMetrics.slice().sort((a, b) => b.rtoCount - a.rtoCount).filter((s) => s.rtoCount > 0).slice(0, TOP_N),
    [skuMetrics]
  );

  const feeData = useMemo(() => computeFeeData(fees), [fees]);
  const advertisingData = useMemo(() => computeAdvertisingData(fees), [fees]);
  const totalAdSpend = useMemo(
    () => fees.filter((f) => f.fee_type === 'Cost of Advertising').reduce((s, f) => s + Math.abs(f.fee_amount ?? 0), 0),
    [fees]
  );
  const prevTotalAdSpend = useMemo(
    () => prevFees.filter((f) => f.fee_type === 'Cost of Advertising').reduce((s, f) => s + Math.abs(f.fee_amount ?? 0), 0),
    [prevFees]
  );

  const topTotalRevenue = useMemo(() => records.filter((r) => r.transaction_type === SHIPMENT).reduce((s, r) => s + (r.invoice_amount ?? 0), 0), [records]);
  const prevTopTotalRevenue = useMemo(() => prevRecords.filter((r) => r.transaction_type === SHIPMENT).reduce((s, r) => s + (r.invoice_amount ?? 0), 0), [prevRecords]);

  const top3Revenue = useMemo(() => {
    const byRevenue = skuMetrics.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 3);
    const top3Total = byRevenue.reduce((s, r) => s + r.revenue, 0);
    return topTotalRevenue > 0 ? (top3Total / topTotalRevenue) * 100 : 0;
  }, [skuMetrics, topTotalRevenue]);

  const filteredRecords = useMemo(() => {
    if (!selectedSku) return records;
    return records.filter((r) => r.sku === selectedSku);
  }, [records, selectedSku]);

  // Compute New vs Repeat SKUs metrics
  const repeatNewSplit = useMemo(() => {
    if (!previousPeriod || prevRecords.length === 0) return null;
    
    // Get unique active SKUs (had shipments)
    const currSkuShipments = records.filter(r => r.transaction_type === SHIPMENT && r.sku);
    const prevSkuShipments = prevRecords.filter(r => r.transaction_type === SHIPMENT && r.sku);
    
    const currSkus = new Set(currSkuShipments.map(r => r.sku!));
    const prevSkus = new Set(prevSkuShipments.map(r => r.sku!));
    
    const newSkus = new Set([...currSkus].filter(sku => !prevSkus.has(sku)));
    const repeatSkus = new Set([...currSkus].filter(sku => prevSkus.has(sku)));
    const lostSkus = new Set([...prevSkus].filter(sku => !currSkus.has(sku)));
    
    // Calculate revenue contribution
    let newRevenue = 0;
    let repeatRevenue = 0;
    
    for (const r of currSkuShipments) {
      if (newSkus.has(r.sku!)) {
        newRevenue += (r.invoice_amount ?? 0);
      } else {
        repeatRevenue += (r.invoice_amount ?? 0);
      }
    }
    
    const totalRev = newRevenue + repeatRevenue;
    const newRevPct = totalRev > 0 ? (newRevenue / totalRev) * 100 : 0;
    const repeatRevPct = totalRev > 0 ? (repeatRevenue / totalRev) * 100 : 0;
    
    return {
      newCount: newSkus.size,
      repeatCount: repeatSkus.size,
      lostCount: lostSkus.size,
      newRevenue,
      repeatRevenue,
      newRevPct,
      repeatRevPct,
      totalActive: currSkus.size,
    };
  }, [records, prevRecords, previousPeriod]);

  if (!state.selectedPeriod) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">
          <BarChart3 size={48} />
        </span>
        <p className="empty-state-title">No period selected</p>
        <p className="empty-state-description">Select a period to view product insights</p>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const skuTableColumns = [
    { key: 'sku' as const, header: 'SKU', sortable: true, width: '120px' },
    { key: 'description' as const, header: 'Description', sortable: true },
    { key: 'unitsSold' as const, header: 'Units Sold', sortable: true, align: 'right' as const },
    {
      key: 'revenue' as const,
      header: 'Revenue',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => formatINR(v as number),
    },
    {
      key: 'refunds' as const,
      header: 'Refunds',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => formatINR(v as number),
    },
    {
      key: 'refundRate' as const,
      header: 'Refund Rate',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => {
        const pct = v as number;
        const color = pct > 15 ? '#DC2626' : pct > 5 ? '#D97706' : '#16A34A';
        return <span style={{ color, fontWeight: 600 }}>{formatPct(pct)}</span>;
      },
    },
    {
      key: 'totalCharges' as const,
      header: 'Charges',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => formatINR(v as number),
    },
    {
      key: 'netReceived' as const,
      header: 'Net Received',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => formatINR(v as number),
    },
    {
      key: 'profitabilityScore' as const,
      header: 'Profitability Score',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => {
        const score = v as number;
        const color = score < 60 ? '#DC2626' : score < 80 ? '#D97706' : '#16A34A';
        return <span style={{ color, fontWeight: 600 }}>{formatPct(score)}</span>;
      },
    },
  ];

  return (
    <div className="products-page">
      {/* Revenue concentration callout */}
      <div className="card products-concentration-card">
        <div className="concentration-icon"><Lightbulb size={24} /></div>
        <div>
          <p className="concentration-title">Revenue Concentration</p>
          <p className="concentration-desc">
            Top 3 SKUs account for <strong>{formatPct(top3Revenue)}</strong> of total revenue
          </p>
        </div>
        <div className="concentration-kpi">
          <span className="concentration-value">{formatPct(top3Revenue, 1)}</span>
        </div>
      </div>

      {/* Ad Spend KPI */}
      <div className="kpi-grid">
        <KpiCard
          title="Total Advertising Spend"
          value={formatINR(totalAdSpend)}
          rawValue={totalAdSpend}
          icon={<Megaphone size={20} />}
          color="warning"
          {...(previousPeriod && prevRecords.length > 0 ? getCompareDetails(totalAdSpend, prevTotalAdSpend) : {})}
        />
        <KpiCard
          title="Advertising ROI Proxy"
          value={totalAdSpend > 0 ? `${(topTotalRevenue / totalAdSpend).toFixed(2)}x` : 'N/A'}
          rawValue={totalAdSpend > 0 ? (topTotalRevenue / totalAdSpend) : undefined}
          icon={<TrendingUp size={20} />}
          color="success"
          {...(previousPeriod && prevRecords.length > 0 ? getCompareDetails(
            totalAdSpend > 0 ? (topTotalRevenue / totalAdSpend) : 0,
            prevTotalAdSpend > 0 ? (prevTopTotalRevenue / prevTotalAdSpend) : 0
          ) : {})}
        />
        <KpiCard
          title="Total SKUs"
          value={skuMetrics.length.toLocaleString('en-IN')}
          rawValue={skuMetrics.length}
          icon={<Tag size={20} />}
          {...(previousPeriod && prevRecords.length > 0 ? getCompareDetails(skuMetrics.length, prevSkuMetrics.length) : {})}
        />
      </div>

      {/* Top 10 Best-Selling SKUs */}
      <div className="card">
        <h3 className="section-title"><BarChart3 size={20} className="inline-icon" /> Top 10 SKUs by Units Sold</h3>
        <p className="products-chart-hint">Click a bar to filter the table below</p>
        <BarChart
          data={topSkusByUnits.map((s) => ({ name: s.sku || 'Unknown', value: s.unitsSold }))}
          dataKey="value"
          layout="vertical"
          height={350}
          colorEachBar
          formatter={(v) => `${v.toLocaleString('en-IN')} units`}
          onBarClick={(name) => setSelectedSku(selectedSku === name ? null : name)}
        />
        {selectedSku && (
          <div className="products-filter-active">
            <span>Filtered by SKU: <strong>{selectedSku}</strong></span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedSku(null)}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* SKU Performance Table */}
      <div className="card">
        <h3 className="section-title">SKU Performance Table</h3>
        <DataTable
          columns={skuTableColumns as Parameters<typeof DataTable>[0]['columns']}
          data={skuMetrics as unknown as Parameters<typeof DataTable>[0]['data']}
          searchable
          searchKeys={['sku', 'description'] as (keyof SkuMetric)[]}
          exportable
          exportFilename="sku_performance"
          pageSize={25}
        />
      </div>

      {/* RTO Ranking */}
      <div className="card">
        <h3 className="section-title">RTO / Cancellation by SKU (Top 10)</h3>
        {topSkusByRto.length > 0 ? (
          <BarChart
            data={topSkusByRto.map((s) => ({ name: s.sku || 'Unknown', value: s.rtoCount }))}
            dataKey="value"
            layout="vertical"
            height={300}
            colorEachBar
            formatter={(v) => `${v.toLocaleString('en-IN')} orders`}
          />
        ) : (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <span className="empty-state-icon"><CheckCircle2 size={48} /></span>
            <p className="empty-state-title">No RTO / Cancellations found</p>
          </div>
        )}
      </div>

      {/* Fee breakdown by SKU */}
      <div className="products-two-col">
        <div className="card">
          <h3 className="section-title">Top 10 SKUs by Expenses</h3>
          <BarChart
            data={feeData.topSkus.map((s) => ({ name: s.sku, value: Math.abs(s.totalFees) }))}
            dataKey="value"
            layout="vertical"
            height={300}
            colorEachBar
            formatter={formatINR}
          />
        </div>
        <div className="card">
          <h3 className="section-title">Fee Breakdown by Type</h3>
          <DonutChart
            data={feeData.byType.map((t) => ({ name: t.type, value: Math.abs(t.amount) }))}
            formatter={formatINR}
            height={300}
          />
        </div>
      </div>

      {/* Advertising spend by SKU */}
      <div className="card">
        <h3 className="section-title">Advertising Spend by SKU</h3>
        {advertisingData.length > 0 ? (
          <BarChart
            data={advertisingData.map((d) => ({ name: d.sku, value: Math.abs(d.spend) }))}
            dataKey="value"
            layout="vertical"
            height={300}
            colorEachBar
            formatter={formatINR}
          />
        ) : (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <span className="empty-state-icon"><Megaphone size={48} /></span>
            <p className="empty-state-title">No SKU-level advertising cost data available</p>
            <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
              All advertising costs (<strong>{formatINR(totalAdSpend)}</strong>) were charged at the <strong>Account Level</strong> (not associated with specific product SKUs).
            </p>
          </div>
        )}
      </div>

      {/* Filtered records table */}
      {selectedSku && (
        <div className="card">
          <h3 className="section-title">Invoices for SKU: {selectedSku}</h3>
          <DataTable
            columns={[
              { key: 'invoice_no' as keyof ConsolidatedRecord, header: 'Invoice No', sortable: true },
              {
                key: 'invoice_date' as keyof ConsolidatedRecord,
                header: 'Date',
                sortable: true,
                render: (v) => formatDateTime(v as string),
              },
              {
                key: 'transaction_type' as keyof ConsolidatedRecord,
                header: 'Type',
                render: (v) => <Badge label={String(v ?? '')} />,
              },
              { key: 'quantity' as keyof ConsolidatedRecord, header: 'Qty', sortable: true, align: 'right' as const },
              {
                key: 'invoice_amount' as keyof ConsolidatedRecord,
                header: 'Invoice Amt',
                sortable: true,
                align: 'right' as const,
                render: (v) => formatINR(v as number),
              },
              {
                key: 'total' as keyof ConsolidatedRecord,
                header: 'Total',
                sortable: true,
                align: 'right' as const,
                render: (v) => formatINR(v as number),
              },
            ]}
            data={filteredRecords as unknown as Parameters<typeof DataTable>[0]['data']}
            pageSize={20}
          />
        </div>
      )}

      {/* New vs Repeat SKUs card */}
      <div className="card">
        <h3 className="section-title"><RefreshCw size={20} className="inline-icon" /> New vs Repeat SKUs</h3>
        
        {repeatNewSplit ? (
          <div className="products-split-container">
            <div className="products-split-grid">
              <div className="products-split-item products-split-item--success">
                <span className="products-split-label">Repeat SKUs</span>
                <span className="products-split-value">{repeatNewSplit.repeatCount} SKUs</span>
                <span className="products-split-desc">
                  Contribution: <strong>{formatINR(repeatNewSplit.repeatRevenue)}</strong> ({repeatNewSplit.repeatRevPct.toFixed(1)}%)
                </span>
              </div>
              <div className="products-split-item products-split-item--warning">
                <span className="products-split-label">New SKUs</span>
                <span className="products-split-value">{repeatNewSplit.newCount} SKUs</span>
                <span className="products-split-desc">
                  Contribution: <strong>{formatINR(repeatNewSplit.newRevenue)}</strong> ({repeatNewSplit.newRevPct.toFixed(1)}%)
                </span>
              </div>
              <div className="products-split-item products-split-item--neutral">
                <span className="products-split-label">Lost SKUs</span>
                <span className="products-split-value">{repeatNewSplit.lostCount} SKUs</span>
                <span className="products-split-desc">Sold last period but not this period</span>
              </div>
            </div>
            
            {/* Visual ratio bar */}
            <div className="products-split-bar-wrapper">
              <div className="products-split-bar-legend">
                <span className="legend-item legend-item--repeat">● Repeat SKUs ({repeatNewSplit.repeatRevPct.toFixed(1)}%)</span>
                <span className="legend-item legend-item--new">● New SKUs ({repeatNewSplit.newRevPct.toFixed(1)}%)</span>
              </div>
              <div className="products-split-bar">
                <div 
                  className="products-split-bar-segment products-split-bar-segment--repeat" 
                  style={{ width: `${repeatNewSplit.repeatRevPct}%` }}
                />
                <div 
                  className="products-split-bar-segment products-split-bar-segment--new" 
                  style={{ width: `${repeatNewSplit.newRevPct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <span className="empty-state-icon"><RefreshCw size={48} /></span>
            <p className="empty-state-title">New vs Repeat SKUs Trend</p>
            <p className="empty-state-description">
              Will show trend when multiple periods are uploaded. Upload more periods to compare SKU performance over time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Computation helpers ----

function computeSkuMetrics(records: ConsolidatedRecord[]): SkuMetric[] {
  const bySkuShipment = new Map<string, { units: number; revenue: number; charges: number; net: number; desc: string }>();
  const bySkuRefunds = new Map<string, number>();
  const bySkuRefundCount = new Map<string, number>();
  const bySkuShipmentCount = new Map<string, number>();
  const bySkuRto = new Map<string, number>();

  for (const r of records) {
    const sku = r.sku ?? 'Unknown';
    const desc = r.item_description ?? '';

    if (r.transaction_type === SHIPMENT) {
      const existing = bySkuShipment.get(sku) ?? { units: 0, revenue: 0, charges: 0, net: 0, desc };
      bySkuShipment.set(sku, {
        units: existing.units + (r.quantity ?? 0),
        revenue: existing.revenue + (r.invoice_amount ?? 0),
        charges: existing.charges + (r.charges ?? 0),
        net: existing.net + (r.total ?? 0),
        desc: existing.desc || desc,
      });
      bySkuShipmentCount.set(sku, (bySkuShipmentCount.get(sku) ?? 0) + 1);
    } else if (r.transaction_type === 'Refund') {
      bySkuRefunds.set(sku, (bySkuRefunds.get(sku) ?? 0) + (r.invoice_amount ?? 0));
      bySkuRefundCount.set(sku, (bySkuRefundCount.get(sku) ?? 0) + 1);
    } else if (RTO_TYPES.includes(r.transaction_type ?? '')) {
      bySkuRto.set(sku, (bySkuRto.get(sku) ?? 0) + 1);
    }
  }

  const metrics: SkuMetric[] = [];

  for (const [sku, data] of bySkuShipment.entries()) {
    const refunds = bySkuRefunds.get(sku) ?? 0;
    const refundCount = bySkuRefundCount.get(sku) ?? 0;
    const shipCount = bySkuShipmentCount.get(sku) ?? 0;
    const rtoCount = bySkuRto.get(sku) ?? 0;
    const refundRate = (shipCount + refundCount) > 0 ? (refundCount / (shipCount + refundCount)) * 100 : 0;
    const profitabilityScore = data.revenue > 0 ? ((data.revenue + data.charges + refunds) / data.revenue) * 100 : 0;

    metrics.push({
      sku,
      description: data.desc,
      unitsSold: data.units,
      revenue: data.revenue,
      refunds,
      refundRate,
      totalCharges: data.charges,
      netReceived: data.net,
      rtoCount,
      profitabilityScore,
    });
  }

  return metrics.sort((a, b) => b.revenue - a.revenue);
}

const FEE_HIGHLIGHT_TYPES = [
  'FBA Pick & Pack Fee',
  'FBA Weight Handling Fee',
  'Commission',
  'Fixed closing fee',
  'Easy Ship Weight Handling Fee',
  'Refund Commission',
  'Cost of Advertising',
];

function computeFeeData(fees: SettlementFee[]) {
  const bySkuMap = new Map<string, number>();
  const byTypeMap = new Map<string, number>();

  for (const fee of fees) {
    const amount = fee.fee_amount ?? 0;
    
    // Attribute to SKU or 'Account Level' if no SKU is associated
    const skuKey = fee.sku && fee.sku.trim() !== '' ? fee.sku.trim() : 'Account Level';
    bySkuMap.set(skuKey, (bySkuMap.get(skuKey) ?? 0) + amount);

    // Group fee types (combine similar ones) - keep all fees for overall breakdown
    let feeTypeLabel = 'Others';
    for (const highlight of FEE_HIGHLIGHT_TYPES) {
      if (fee.fee_type.toLowerCase().includes(highlight.toLowerCase())) {
        feeTypeLabel = highlight;
        break;
      }
    }
    byTypeMap.set(feeTypeLabel, (byTypeMap.get(feeTypeLabel) ?? 0) + amount);
  }

  // Filter out 'Account Level' to strictly show product SKUs in this list
  const topSkus = [...bySkuMap.entries()]
    .filter(([sku]) => sku !== 'Account Level')
    .sort((a, b) => a[1] - b[1]) // Most negative = most fees
    .slice(0, TOP_N)
    .map(([sku, totalFees]) => ({ sku, totalFees }));

  const byType = [...byTypeMap.entries()]
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => a.amount - b.amount);

  return { topSkus, byType };
}

function computeAdvertisingData(fees: SettlementFee[]) {
  const bySkuMap = new Map<string, number>();

  for (const fee of fees) {
    if (fee.fee_type !== 'Cost of Advertising') continue;
    
    // Attribute advertising to SKU or 'Account Level' if no SKU is associated
    const skuKey = fee.sku && fee.sku.trim() !== '' ? fee.sku.trim() : 'Account Level';
    bySkuMap.set(skuKey, (bySkuMap.get(skuKey) ?? 0) + (fee.fee_amount ?? 0));
  }

  // Filter out 'Account Level' to strictly show product SKU ad spend in the chart
  return [...bySkuMap.entries()]
    .filter(([sku]) => sku !== 'Account Level')
    .sort((a, b) => a[1] - b[1])
    .slice(0, TOP_N)
    .map(([sku, spend]) => ({ sku, spend }));
}
