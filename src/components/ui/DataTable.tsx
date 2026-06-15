import { useState, useMemo, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { SkeletonTable } from './Loader';
import { Download } from 'lucide-react';
import './DataTable.css';

/** Default number of rows per page */
const DEFAULT_PAGE_SIZE = 50;

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  exportable?: boolean;
  exportFilename?: string;
  pageSize?: number;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
  onCustomExport?: (data: T[]) => void;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  searchable = false,
  searchKeys,
  exportable = false,
  exportFilename = 'export',
  pageSize = DEFAULT_PAGE_SIZE,
  rowClassName,
  emptyMessage = 'No data available',
  onCustomExport,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    const keys = searchKeys ?? (columns.map((c) => c.key) as (keyof T)[]);
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? '').toLowerCase().includes(lower))
    );
  }, [data, search, searchKeys, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const aStr = String(av ?? '');
      const bStr = String(bv ?? '');
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);

      let cmp: number;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        cmp = aNum - bNum;
      } else {
        cmp = aStr.localeCompare(bStr);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleExport() {
    if (onCustomExport) {
      onCustomExport(sorted);
      return;
    }
    const exportData = sorted.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.header] = row[col.key];
      }
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Style header row
    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[addr]) continue;
      worksheet[addr].s = {
        fill: { fgColor: { rgb: '1F3864' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
      };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated');
    XLSX.writeFile(workbook, `${exportFilename}.xlsx`);
  }

  if (loading) {
    return <SkeletonTable rows={8} />;
  }

  return (
    <div className="data-table-wrapper">
      {/* Controls */}
      {(searchable || exportable) && (
        <div className="data-table-controls">
          {searchable && (
            <div className="data-table-search-wrapper">
              <span className="data-table-search-icon" aria-hidden="true">🔍</span>
              <input
                id="data-table-search"
                type="text"
                className="input data-table-search"
                placeholder="Search..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                aria-label="Search table"
              />
              {search && (
                <button
                  className="data-table-search-clear"
                  onClick={() => handleSearch('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="data-table-controls-right">
            <span className="data-table-count">
              {sorted.length.toLocaleString('en-IN')} rows
            </span>
            {exportable && (
              <button
                id="export-excel-btn"
                className="btn btn-secondary btn-sm"
                onClick={handleExport}
                aria-label="Export to Excel"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
              >
                <Download size={14} /> Export Excel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="data-table-scroll">
        <table className="data-table" role="grid">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`data-table-th ${col.sortable ? 'data-table-th--sortable' : ''} data-table-th--${col.align ?? 'left'}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  role={col.sortable ? 'columnheader button' : 'columnheader'}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <span className="data-table-th-content">
                    {col.header}
                    {col.sortable && (
                      <span className="data-table-sort-icon" aria-hidden="true">
                        {sortKey === col.key
                          ? sortDir === 'asc'
                            ? ' ↑'
                            : ' ↓'
                          : ' ↕'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`data-table-row ${rowClassName ? rowClassName(row) : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`data-table-td data-table-td--${col.align ?? 'left'}`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="data-table-pagination">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            «
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="data-table-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
