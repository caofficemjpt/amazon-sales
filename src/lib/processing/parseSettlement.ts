import Papa from 'papaparse';
import type { SettlementRow } from '../../types';

/** Expected number of columns in a settlement file */
const EXPECTED_COLUMN_COUNT = 36;

/** Columns that should be parsed as numbers */
const NUMERIC_COLUMNS = [
  'price-amount',
  'item-related-fee-amount',
  'promotion-amount',
  'other-amount',
] as const;

export interface ParseSettlementResult {
  rows: SettlementRow[];
  allUnfilteredRows: SettlementRow[];
  depositDateMap: Map<string, string>;
  warnings: string[];
}

/**
 * Parse one or more settlement TXT files (tab-separated).
 * Captures deposit-date from summary rows (order-id blank) before filtering them out.
 */
export async function parseSettlementFiles(
  files: FileList
): Promise<ParseSettlementResult> {
  if (files.length === 0) {
    throw new Error('No .txt files found in the selection.');
  }

  const allRows: SettlementRow[] = [];
  const allUnfilteredRows: SettlementRow[] = [];
  const depositDateMap = new Map<string, string>();
  const warnings: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await parseSingleSettlementFile(file, warnings);
    allUnfilteredRows.push(...result.allRows);
    
    // Capture deposit dates from summary rows (order-id blank)
    for (const row of result.allRows) {
      const orderId = String(row['order-id'] ?? '').trim();
      const depositDate = String(row['deposit-date'] ?? '').trim();
      const settlementId = String(row['settlement-id'] ?? '').trim();
      
      if (!orderId && depositDate && settlementId) {
        depositDateMap.set(settlementId, depositDate);
      }
    }

    // Filter out rows where order-id is blank
    const filteredRows = result.allRows.filter((row) => {
      const orderId = String(row['order-id'] ?? '').trim();
      return orderId !== '';
    });

    allRows.push(...filteredRows);
  }

  return { rows: allRows, allUnfilteredRows, depositDateMap, warnings };
}

interface SingleFileResult {
  allRows: SettlementRow[];
}

function parseSingleSettlementFile(
  file: File,
  warnings: string[]
): Promise<SingleFileResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string | number>>(file, {
      delimiter: '\t',
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Strip BOM character from column names
        return header.replace(/^\uFEFF/, '').trim();
      },
      complete: (results) => {
        const fields = results.meta.fields ?? [];

        // Validate column count
        if (fields.length !== EXPECTED_COLUMN_COUNT) {
          warnings.push(
            `⚠️ File "${file.name}" has ${fields.length} columns (expected ${EXPECTED_COLUMN_COUNT}). Processing will continue.`
          );
        }

        // Cast numeric columns
        const rows = results.data.map((raw) => {
          const row = { ...raw } as SettlementRow;
          for (const col of NUMERIC_COLUMNS) {
            const val = raw[col];
            row[col] = typeof val === 'string' ? parseFloat(val) || 0 : (val ?? 0) as number;
          }
          return row;
        });

        resolve({ allRows: rows });
      },
      error: (err: Error) => {
        reject(new Error(`Failed to parse "${file.name}": ${err.message}`));
      },
    });
  });
}
