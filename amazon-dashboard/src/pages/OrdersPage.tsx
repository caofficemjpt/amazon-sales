import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { usePeriodContext } from '../context/PeriodContext';
import { useRecords } from '../hooks/useRecords';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Loader';
import { formatINR, formatDateTime } from '../utils/format';
import { ClipboardList, Search } from 'lucide-react';
import type { ConsolidatedRecord } from '../types';

export function OrdersPage() {
  const { state } = usePeriodContext();
  const { records, loading } = useRecords(state.selectedPeriod?.id ?? null);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGstns, setSelectedGstns] = useState<string[]>([]);

  // Unique lists for filter options
  const transactionTypes = useMemo(() => {
    const types = new Set<string>();
    records.forEach((r) => {
      if (r.transaction_type) types.add(r.transaction_type);
    });
    return Array.from(types).sort();
  }, [records]);

  const sellerGstns = useMemo(() => {
    const gstns = new Set<string>();
    records.forEach((r) => {
      if (r.seller_gstn) gstns.add(r.seller_gstn);
    });
    return Array.from(gstns).sort();
  }, [records]);

  // Filter records based on selected filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedTypes.length > 0 && (!r.transaction_type || !selectedTypes.includes(r.transaction_type))) {
        return false;
      }
      if (selectedGstns.length > 0 && (!r.seller_gstn || !selectedGstns.includes(r.seller_gstn))) {
        return false;
      }
      return true;
    });
  }, [records, selectedTypes, selectedGstns]);

  // Row color styling classes based on transaction types
  const getRowClassName = (row: ConsolidatedRecord) => {
    const type = row.transaction_type;
    if (type === 'Refund') return 'data-table-row--refund';
    if (type === 'FreeReplacement') return 'data-table-row--replacement';
    if (type === 'Cancel') return 'data-table-row--cancel';
    return '';
  };

  // Define Columns
  const columns: Column<ConsolidatedRecord>[] = useMemo(
    () => [
      {
        key: 'invoice_no',
        header: 'Invoice & Order',
        sortable: true,
        width: '240px',
        render: (_, row) => (
          <div className="orders-cell-vertical">
            <div><strong>Inv:</strong> {row.invoice_no || 'N/A'}</div>
            <div className="text-muted text-sm">Date: {formatDateTime(row.invoice_date)}</div>
            <div style={{ marginTop: 'var(--space-1)' }}><strong>Order:</strong> {row.order_id || 'N/A'}</div>
            <div className="text-muted text-sm">Date: {formatDateTime(row.order_date)}</div>
            <div className="text-muted text-sm">GSTN: {row.seller_gstn || 'N/A'}</div>
          </div>
        ),
      },
      {
        key: 'sku',
        header: 'Product Details',
        sortable: true,
        width: '280px',
        render: (_, row) => (
          <div className="orders-cell-vertical">
            <div><strong>SKU:</strong> {row.sku || 'N/A'}</div>
            <div className="text-sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', lineHeight: '1.2' }}>
              {row.item_description || 'No description'}
            </div>
            <div style={{ marginTop: 'var(--space-1)' }}>
              <strong>Qty:</strong> {row.quantity ?? 0} | <strong>Channel:</strong> {row.fulfillment_channel || 'N/A'}
            </div>
          </div>
        ),
      },
      {
        key: 'transaction_type',
        header: 'Type & Payment',
        sortable: true,
        width: '150px',
        render: (_, row) => {
          const type = row.transaction_type;
          let variant: 'success' | 'danger' | 'warning' | 'default' = 'default';
          if (type === 'Shipment') variant = 'success';
          if (type === 'Refund') variant = 'danger';
          if (type === 'FreeReplacement') variant = 'warning';
          return (
            <div className="orders-cell-vertical">
              <Badge label={type || 'Unknown'} variant={variant} />
              <div className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
                <strong>Pay:</strong> {row.payment_type || 'N/A'}
              </div>
            </div>
          );
        },
      },
      {
        key: 'invoice_amount',
        header: 'Amounts (INR)',
        sortable: true,
        align: 'right',
        width: '180px',
        render: (_, row) => (
          <div className="orders-cell-vertical align-right">
            <div><strong>Invoice:</strong> {formatINR(row.invoice_amount ?? 0)}</div>
            <div className="text-muted text-sm">Excl: {formatINR(row.tax_exclusive_amount ?? 0)}</div>
            <div className="text-muted text-sm">Tax: {formatINR(row.total_tax_amount ?? 0)}</div>
          </div>
        ),
      },
      {
        key: 'charges',
        header: 'Deductions (INR)',
        sortable: true,
        align: 'right',
        width: '180px',
        render: (_, row) => (
          <div className="orders-cell-vertical align-right text-sm">
            <div><strong>Charges:</strong> {formatINR(row.charges ?? 0)}</div>
            <div><strong>TCS:</strong> {formatINR(row.tcs_igst ?? 0)}</div>
            <div><strong>TDS:</strong> {formatINR(row.tds ?? 0)}</div>
            <div><strong>Promos:</strong> {formatINR(row.promos ?? 0)}</div>
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Settlement & Net',
        sortable: true,
        align: 'right',
        width: '200px',
        render: (_, row) => (
          <div className="orders-cell-vertical align-right">
            <div><strong>Net: <span className="text-primary" style={{ fontSize: '1.05rem' }}>{formatINR(row.total ?? 0)}</span></strong></div>
            <div className="text-muted text-sm" style={{ marginTop: 'var(--space-1)' }}>Settlement ID:</div>
            <div className="text-muted text-sm font-mono" style={{ wordBreak: 'break-all', whiteSpace: 'normal', width: '150px' }}>{row.settlement_id || 'N/A'}</div>
            <div className="text-muted text-sm">Deposit: {formatDateTime(row.deposit_date)}</div>
          </div>
        ),
      },
    ],
    []
  );

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleGstnFilter = (gstn: string) => {
    setSelectedGstns((prev) =>
      prev.includes(gstn) ? prev.filter((g) => g !== gstn) : [...prev, gstn]
    );
  };

  const handleCustomExport = (rawData: any[]) => {
    const data = rawData as ConsolidatedRecord[];
    // Sheet 1: Consolidated raw rows
    const consolidatedRows = data.map((r) => ({
      'Seller GSTN': r.seller_gstn || '',
      'Invoice No': r.invoice_no || '',
      'Invoice Date': formatDateTime(r.invoice_date),
      'Transaction Type': r.transaction_type || '',
      'Order ID': r.order_id || '',
      'Order Date': formatDateTime(r.order_date),
      'SKU': r.sku || '',
      'Description': r.item_description || '',
      'Quantity': r.quantity ?? 0,
      'Taxable Amount': r.tax_exclusive_amount ?? 0,
      'Tax Amount': r.total_tax_amount ?? 0,
      'Invoice Amount': r.invoice_amount ?? 0,
      'Charges': r.charges ?? 0,
      'TCS IGST': r.tcs_igst ?? 0,
      'TDS': r.tds ?? 0,
      'Promos': r.promos ?? 0,
      'Total Received (Net)': r.total ?? 0,
      'Settlement ID': r.settlement_id || '',
      'Deposit Date': formatDateTime(r.deposit_date),
      'Payment Type': r.payment_type || '',
      'Fulfillment Channel': r.fulfillment_channel || '',
    }));

    // Sheet 2: GSTN Summary
    const byGstn: Record<
      string,
      { taxable: number; gst: number; total: number; charges: number; totalReceived: number }
    > = {};

    for (const r of data) {
      const gstn = r.seller_gstn || '—';
      if (!byGstn[gstn]) {
        byGstn[gstn] = { taxable: 0, gst: 0, total: 0, charges: 0, totalReceived: 0 };
      }
      byGstn[gstn].taxable += r.tax_exclusive_amount ?? 0;
      byGstn[gstn].gst += r.total_tax_amount ?? 0;
      byGstn[gstn].total += r.invoice_amount ?? 0;
      byGstn[gstn].charges += r.charges ?? 0;
      byGstn[gstn].totalReceived += r.total ?? 0;
    }

    const summaryRows = Object.entries(byGstn).map(([gstn, v]) => ({
      'Seller GSTN': gstn,
      'Taxable': Number(v.taxable.toFixed(2)),
      'GST': Number(v.gst.toFixed(2)),
      'Total': Number(v.total.toFixed(2)),
      'Charges': Number(v.charges.toFixed(2)),
      'Total Received': Number(v.totalReceived.toFixed(2)),
    }));

    // Calculate Grand Total
    const totals = summaryRows.reduce(
      (acc, r) => ({
        'Taxable': acc.Taxable + r.Taxable,
        'GST': acc.GST + r.GST,
        'Total': acc.Total + r.Total,
        'Charges': acc.Charges + r.Charges,
        'Total Received': acc['Total Received'] + r['Total Received'],
      }),
      { 'Taxable': 0, 'GST': 0, 'Total': 0, 'Charges': 0, 'Total Received': 0 }
    );

    summaryRows.push({
      'Seller GSTN': 'GRAND TOTAL',
      'Taxable': Number(totals.Taxable.toFixed(2)),
      'GST': Number(totals.GST.toFixed(2)),
      'Total': Number(totals.Total.toFixed(2)),
      'Charges': Number(totals.Charges.toFixed(2)),
      'Total Received': Number(totals['Total Received'].toFixed(2)),
    });

    const consolidatedWorksheet = XLSX.utils.json_to_sheet(consolidatedRows);
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);

    // Style helper for worksheets headers
    const styleHeader = (worksheet: XLSX.WorkSheet) => {
      const ref = worksheet['!ref'];
      if (!ref) return;
      const range = XLSX.utils.decode_range(ref);
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!worksheet[addr]) continue;
        worksheet[addr].s = {
          fill: { fgColor: { rgb: '1F3864' } },
          font: { color: { rgb: 'FFFFFF' }, bold: true },
        };
      }
    };

    styleHeader(consolidatedWorksheet);
    styleHeader(summaryWorksheet);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, consolidatedWorksheet, 'Consolidated');

    // Naming the summary sheet: "Summary of [Month] - [Year]"
    const month = state.selectedPeriod?.month || '';
    const year = state.selectedPeriod?.year || '';
    const sheetName = month && year ? `Summary of ${month} - ${year}` : 'GSTN Summary';
    const safeSheetName = sheetName.slice(0, 31);

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, safeSheetName);

    XLSX.writeFile(workbook, `consolidated_${month}_${year}.xlsx`);
  };

  if (!state.selectedPeriod) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">
          <ClipboardList size={48} />
        </span>
        <p className="empty-state-title">No period selected</p>
        <p className="empty-state-description">
          Select or upload a period to view orders
        </p>
      </div>
    );
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="orders-page fade-in">
      <div className="card filters-card">
        <h3 className="section-title"><Search size={18} className="inline-icon" /> Table Filters</h3>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Transaction Type</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {transactionTypes.map((type) => {
                const active = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => toggleTypeFilter(type)}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Seller GSTN</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {sellerGstns.map((gstn) => {
                const active = selectedGstns.includes(gstn);
                return (
                  <button
                    key={gstn}
                    type="button"
                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => toggleGstnFilter(gstn)}
                  >
                    {gstn || 'None'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <DataTable
          columns={columns as any}
          data={filteredRecords as any}
          searchable
          searchKeys={['invoice_no', 'order_id', 'sku', 'item_description']}
          exportable
          exportFilename={`consolidated_${state.selectedPeriod.month}_${state.selectedPeriod.year}`}
          rowClassName={getRowClassName as any}
          onCustomExport={handleCustomExport}
        />
      </div>
    </div>
  );
}
