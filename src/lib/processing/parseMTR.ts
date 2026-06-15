import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
 * Parse the MTR (Monthly Tax Report) CSV or Excel file.
 * Throws if any required column is missing.
 */
export function parseMTRFile(file: File): Promise<MTRRow[]> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

          if (rawRows.length === 0) {
            resolve([]);
            return;
          }

          // Validate required columns
          const firstRow = rawRows[0];
          const fields = Object.keys(firstRow);
          const missing = REQUIRED_MTR_COLUMNS.filter((col) => !fields.includes(col));
          if (missing.length > 0) {
            reject(new Error(`MTR Excel file is missing required columns: ${missing.join(', ')}`));
            return;
          }

          // Cast numeric columns
          const rows = rawRows.map((raw) => {
            const row = { ...raw } as unknown as MTRRow;

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
        } catch (err: any) {
          reject(new Error(`Failed to parse MTR Excel file: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read MTR Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Fallback to CSV parser (PapaParse)
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
