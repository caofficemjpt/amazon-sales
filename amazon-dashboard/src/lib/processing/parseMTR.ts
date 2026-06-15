import Papa from 'papaparse';
import type { MTRRow } from '../../types';

/** Required columns in the MTR CSV */
const REQUIRED_MTR_COLUMNS = [
  'Seller Gstin',
  'Invoice Number',
  'Invoice Date',
  'Transaction Type',
  'Order Id',
  'Order Date',
  'Item Description',
  'Sku',
  'Quantity',
  'Tax Exclusive Gross',
  'Total Tax Amount',
  'Invoice Amount',
] as const;

/** Columns to parse as float */
const FLOAT_COLUMNS = ['Invoice Amount', 'Tax Exclusive Gross', 'Total Tax Amount'] as const;

/** Columns to parse as integer */
const INTEGER_COLUMNS = ['Quantity'] as const;

/**
 * Parse the MTR (Monthly Tax Report) CSV file.
 * Throws if any required column is missing.
 */
export function parseMTRFile(file: File): Promise<MTRRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string | number>>(file, {
      delimiter: ',',
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.replace(/^\uFEFF/, '').trim(),
      complete: (results) => {
        const fields = results.meta.fields ?? [];

        // Validate required columns
        const missing = REQUIRED_MTR_COLUMNS.filter(
          (col) => !fields.includes(col)
        );
        if (missing.length > 0) {
          reject(
            new Error(
              `MTR file is missing required columns: ${missing.join(', ')}`
            )
          );
          return;
        }

        // Cast numeric columns
        const rows = results.data.map((raw) => {
          const row = { ...raw } as MTRRow;

          for (const col of FLOAT_COLUMNS) {
            const val = raw[col];
            row[col] = typeof val === 'string' ? parseFloat(val) || 0 : (val ?? 0) as number;
          }

          for (const col of INTEGER_COLUMNS) {
            const val = raw[col];
            row[col] = typeof val === 'string' ? parseInt(val, 10) || 0 : (val ?? 0) as number;
          }

          return row;
        });

        resolve(rows);
      },
      error: (err: Error) => {
        reject(new Error(`Failed to parse MTR file: ${err.message}`));
      },
    });
  });
}
