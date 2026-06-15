import { supabase } from '../supabase';
import type { ConsolidatedRowInput, SettlementFeeInput, SettlementRow } from '../../types';

/** Batch size for inserts to avoid payload limits */
const BATCH_SIZE = 500;

/** Fee type for advertising costs */
const ADVERTISING_FEE_TYPE = 'Cost of Advertising';

export type ProgressCallback = (step: string, percent: number, log?: string) => void;

/**
 * Step 6 — Build settlement fee records from raw settlement rows.
 * Includes all rows where item-related-fee-amount !== 0.
 */
export function buildFeeRecords(
  settlementRows: SettlementRow[],
  periodId: string
): SettlementFeeInput[] {
  const fees: SettlementFeeInput[] = [];

  for (const row of settlementRows) {
    const feeAmount = row['item-related-fee-amount'] as number;
    const feeType = String(row['item-related-fee-type'] ?? '').trim();
    const orderId = String(row['order-id'] ?? '').trim() || null;
    const sku = String(row['sku'] ?? '').trim() || null;

    // Include fee rows and advertising rows
    if ((!isNaN(feeAmount) && feeAmount !== 0) || feeType === ADVERTISING_FEE_TYPE) {
      fees.push({
        period_id: periodId,
        order_id: orderId,
        sku,
        fee_type: feeType || 'Unknown',
        fee_amount: feeAmount || 0,
      });
    }
  }

  return fees;
}

/**
 * Step 7 — Upload consolidated records and fees to Supabase.
 * Uses upsert with conflict handling and batch inserts.
 */
export async function uploadToSupabase(
  month: string,
  year: number,
  consolidatedRows: ConsolidatedRowInput[],
  feeRows: SettlementFeeInput[],
  onProgress: ProgressCallback
): Promise<string> {
  // Step 7.1 — Upsert period
  onProgress('Upserting period record...', 5, `Upserting period: ${month} ${year}`);

  const { data: periodData, error: periodError } = await supabase
    .from('periods')
    .upsert({ month, year }, { onConflict: 'month,year' })
    .select('id')
    .single();

  if (periodError || !periodData) {
    throw new Error(`Failed to upsert period: ${periodError?.message ?? 'No data returned'}`);
  }

  const periodId = periodData.id as string;
  onProgress('Period record saved.', 10, `Period ID: ${periodId}`);

  // Update period_id in all rows
  const recordsWithPeriod = consolidatedRows.map((r) => ({ ...r, period_id: periodId }));
  const feesWithPeriod = feeRows.map((f) => ({ ...f, period_id: periodId }));

  // Step 7.2 — Delete existing consolidated records
  onProgress('Clearing existing records...', 15, 'Deleting old consolidated records...');
  const { error: deleteRecordsError } = await supabase
    .from('consolidated_records')
    .delete()
    .eq('period_id', periodId);

  if (deleteRecordsError) {
    throw new Error(`Failed to delete existing records: ${deleteRecordsError.message}`);
  }

  // Step 7.3 — Batch insert consolidated records
  const totalRecordBatches = Math.ceil(recordsWithPeriod.length / BATCH_SIZE);
  onProgress(
    `Uploading ${recordsWithPeriod.length} records in ${totalRecordBatches} batches...`,
    20,
    `Inserting ${recordsWithPeriod.length} consolidated records...`
  );

  for (let i = 0; i < totalRecordBatches; i++) {
    const batch = recordsWithPeriod.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('consolidated_records')
      .insert(batch);

    if (insertError) {
      throw new Error(`Failed to insert records batch ${i + 1}: ${insertError.message}`);
    }

    const percent = 20 + Math.round(((i + 1) / totalRecordBatches) * 40);
    onProgress(
      `Uploaded batch ${i + 1} / ${totalRecordBatches}`,
      percent,
      `Batch ${i + 1}/${totalRecordBatches} uploaded`
    );
  }

  // Step 7.4 — Delete existing fee records
  onProgress('Clearing existing fee records...', 62, 'Deleting old settlement fees...');
  const { error: deleteFeesError } = await supabase
    .from('settlement_fees')
    .delete()
    .eq('period_id', periodId);

  if (deleteFeesError) {
    throw new Error(`Failed to delete existing fees: ${deleteFeesError.message}`);
  }

  // Step 7.5 — Batch insert fee records
  const totalFeeBatches = Math.ceil(feesWithPeriod.length / BATCH_SIZE);
  onProgress(
    `Uploading ${feesWithPeriod.length} fee records in ${totalFeeBatches} batches...`,
    65,
    `Inserting ${feesWithPeriod.length} settlement fee records...`
  );

  for (let i = 0; i < totalFeeBatches; i++) {
    const batch = feesWithPeriod.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('settlement_fees')
      .insert(batch);

    if (insertError) {
      throw new Error(`Failed to insert fees batch ${i + 1}: ${insertError.message}`);
    }

    const percent = 65 + Math.round(((i + 1) / totalFeeBatches) * 30);
    onProgress(
      `Uploaded fee batch ${i + 1} / ${totalFeeBatches}`,
      percent,
      `Fee batch ${i + 1}/${totalFeeBatches} uploaded`
    );
  }

  // Step 7.6 — Update row count on period
  onProgress('Finalizing...', 97, 'Updating row count on period...');
  const { error: updateError } = await supabase
    .from('periods')
    .update({ row_count: recordsWithPeriod.length })
    .eq('id', periodId);

  if (updateError) {
    throw new Error(`Failed to update period row count: ${updateError.message}`);
  }

  onProgress('Upload complete!', 100, `✅ Done! ${recordsWithPeriod.length} rows uploaded.`);

  return periodId;
}
