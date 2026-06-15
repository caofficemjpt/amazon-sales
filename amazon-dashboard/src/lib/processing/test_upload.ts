// Setup environment variables before loading any modules
process.env.VITE_SUPABASE_URL = 'https://czdpfgbmbxyzxdvvvftp.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZHBmZ2JtYnh5enhkdnZ2ZnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDA3OTksImV4cCI6MjA5NzA3Njc5OX0.JI4kZznJN1jRHm6W2IlbOtNdghEs5XanlItwLDHKagY';

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { aggregateSettlement, consolidate } from './consolidate';
import { enrichRows } from './enrichment';
import { buildFeeRecords, uploadToSupabase } from './upload';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Override parse single functions for Node environment compatibility since browser FileReaders are not available in Node
function nodeParseFile(content: string, options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      ...options,
      complete: (results) => resolve(results),
      error: (err) => reject(err),
    });
  });
}

async function runLocalUploadTest() {
  console.log('Starting local upload script test...');
  const inputDir = path.resolve('C:/Users/manan/Downloads/Projects/Amazon/Amazone - April/');
  
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir);
  const txtFiles = files.filter(f => f.endsWith('.txt'));
  const mtrCsv = files.find(f => f.endsWith('.csv'));

  if (txtFiles.length === 0 || !mtrCsv) {
    console.error('Missing .txt settlement files or MTR csv file in the input directory.');
    process.exit(1);
  }

  console.log(`Found ${txtFiles.length} settlement TXT files and MTR CSV: ${mtrCsv}`);

  // Step 1: Parse settlement files
  console.log('Step 1: Parsing settlement files...');
  const allSettlementRows: any[] = [];
  const allUnfilteredSettlementRows: any[] = [];
  const depositDateMap = new Map<string, string>();

  for (const name of txtFiles) {
    const filePath = path.join(inputDir, name);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const parseResult = await nodeParseFile(content, {
      delimiter: '\t',
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.replace(/^\uFEFF/, '').trim(),
    });

    const parsedRows = parseResult.data.map((raw: any) => {
      const row = { ...raw };
      for (const col of ['price-amount', 'item-related-fee-amount', 'promotion-amount', 'other-amount']) {
        const val = raw[col];
        row[col] = typeof val === 'string' ? parseFloat(val) || 0 : (val ?? 0) as number;
      }
      return row;
    });

    allUnfilteredSettlementRows.push(...parsedRows);

    // Capture deposit dates
    for (const row of parsedRows) {
      const orderId = String(row['order-id'] ?? '').trim();
      const depositDate = String(row['deposit-date'] ?? '').trim();
      const settlementId = String(row['settlement-id'] ?? '').trim();
      
      if (!orderId && depositDate && settlementId) {
        depositDateMap.set(settlementId, depositDate);
      }
    }

    // Filter out blank order-ids
    const filteredRows = parsedRows.filter((row: any) => String(row['order-id'] ?? '').trim() !== '');
    allSettlementRows.push(...filteredRows);
  }
  console.log(`  Parsed ${allSettlementRows.length} settlement rows`);

  // Step 2: Parse MTR file
  console.log('Step 2: Parsing MTR file...');
  const mtrContent = fs.readFileSync(path.join(inputDir, mtrCsv), 'utf-8');
  const mtrParseResult = await nodeParseFile(mtrContent, {
    delimiter: ',',
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.replace(/^\uFEFF/, '').trim(),
  });

  const mtrRows = mtrParseResult.data.map((raw: any) => {
    const row = { ...raw };
    for (const col of ['Invoice Amount', 'Tax Exclusive Gross', 'Total Tax Amount']) {
      const val = raw[col];
      row[col] = typeof val === 'string' ? parseFloat(val) || 0 : (val ?? 0) as number;
    }
    for (const col of ['Quantity']) {
      const val = raw[col];
      row[col] = typeof val === 'string' ? parseInt(val, 10) || 0 : (val ?? 0) as number;
    }
    return row;
  });
  console.log(`  Parsed ${mtrRows.length} MTR rows`);

  console.log('Step 3 & 4: Consolidating data...');
  const summaryMap = aggregateSettlement(allSettlementRows, depositDateMap);
  const joinWarnings: string[] = [];
  const rawConsolidated = consolidate(mtrRows, summaryMap, 'placeholder', joinWarnings);
  console.log(`  Consolidated ${rawConsolidated.length} records. Warnings count: ${joinWarnings.length}`);

  console.log('Step 5: Enriching records...');
  const enriched = enrichRows(rawConsolidated, mtrRows);
  console.log(`  Enriched ${enriched.length} records`);

  // Print some details of the first few enriched rows to check if duplicates are escaping
  const invoiceFreq = new Map<string, number>();
  for (const row of enriched) {
    const key = String(row.invoice_no).toUpperCase().trim();
    invoiceFreq.set(key, (invoiceFreq.get(key) ?? 0) + 1);
  }
  const duplicates = [...invoiceFreq.entries()].filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`❌ ENRICHED DUPLICATES DETECTED: Found ${duplicates.length} duplicate invoice numbers in enriched array!`);
    console.log('Sample duplicates:', duplicates.slice(0, 5));
  } else {
    console.log('✅ Checked: Enriched array has absolutely zero duplicate invoice numbers.');
  }

  console.log('Step 6: Building settlement fee records...');
  const dummyPeriodId = '1a183c6a-8b1b-4d7a-81ce-931cbb82af7a'; 
  const feeRecords = buildFeeRecords(allUnfilteredSettlementRows, dummyPeriodId);
  console.log(`  Built ${feeRecords.length} fee records`);

  console.log('Step 7: Uploading to Supabase...');
  
  // Clean up existing period before test if present to have clean insert
  console.log('  Deleting existing test period for April 2026 if exists...');
  const { data: oldPeriod } = await supabase
    .from('periods')
    .select('id')
    .eq('month', 'April')
    .eq('year', 2026)
    .maybeSingle();

  if (oldPeriod) {
    console.log(`  Deleting period ID: ${oldPeriod.id}`);
    await supabase.from('periods').delete().eq('id', oldPeriod.id);
  }

  // Perform upload
  const periodId = await uploadToSupabase(
    'April',
    2026,
    enriched,
    feeRecords,
    (step, percent, log) => {
      if (log) console.log(`  [Progress ${percent}%] ${step} -> ${log}`);
    }
  );

  console.log(`\n🎉 Local test upload completed successfully! Period ID: ${periodId}`);
}

runLocalUploadTest().catch(err => {
  console.error('\n❌ Local test upload failed with error:');
  console.error(err);
  process.exit(1);
});
