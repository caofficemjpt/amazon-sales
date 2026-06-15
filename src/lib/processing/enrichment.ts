import type { MTRRow, ConsolidatedRowInput } from '../../types';

/** Payment method code that maps to COD */
const COD_PAYMENT_CODE = 'COD';

/** Fulfillment channel codes */
const FULFILLMENT_FBA = 'AFN';
const FULFILLMENT_SELF_SHIP = 'MFN';
const FULFILLMENT_EASY_SHIP_CONTAINS = 'Easy';

/**
 * Step 5 — Enrich consolidated rows with payment_type and fulfillment_channel.
 * Reads MTR rows to derive these values, then applies them back to consolidated rows.
 *
 * @param consolidatedRows - Rows already joined with settlement data
 * @param mtrRows - Original MTR rows with optional enrichment columns
 * @returns Enriched rows with payment_type and fulfillment_channel set
 */
export function enrichRows(
  consolidatedRows: ConsolidatedRowInput[],
  mtrRows: MTRRow[]
): ConsolidatedRowInput[] {
  // Build a lookup map from Invoice Number → enrichment data
  const enrichmentMap = new Map<string, { paymentType: string | null; fulfillmentChannel: string | null }>();

  for (const mtrRow of mtrRows) {
    const invoiceNo = String(mtrRow['Invoice Number'] ?? '').trim();
    if (!invoiceNo) continue;

    // payment_type
    let paymentType: string | null = null;
    const paymentMethodCode = mtrRow['Payment Method Code'];
    if (paymentMethodCode !== undefined && paymentMethodCode !== null) {
      paymentType = String(paymentMethodCode).trim() === COD_PAYMENT_CODE ? 'COD' : 'Prepaid';
    }

    // fulfillment_channel
    let fulfillmentChannel: string | null = null;
    const fulfillmentChannelRaw = mtrRow['Fulfillment Channel'];
    if (fulfillmentChannelRaw !== undefined && fulfillmentChannelRaw !== null) {
      const channelVal = String(fulfillmentChannelRaw).trim();
      if (channelVal === FULFILLMENT_FBA) {
        fulfillmentChannel = 'FBA';
      } else if (channelVal === FULFILLMENT_SELF_SHIP) {
        fulfillmentChannel = 'Self Ship';
      } else if (channelVal.includes(FULFILLMENT_EASY_SHIP_CONTAINS)) {
        fulfillmentChannel = 'Easy Ship';
      }
    }

    enrichmentMap.set(invoiceNo, { paymentType, fulfillmentChannel });
  }

  // Apply enrichment to consolidated rows
  return consolidatedRows.map((row) => {
    const invoiceNo = row.invoice_no;
    const enrichment = invoiceNo ? enrichmentMap.get(invoiceNo) : undefined;
    if (enrichment) {
      return {
        ...row,
        payment_type: enrichment.paymentType,
        fulfillment_channel: enrichment.fulfillmentChannel,
      };
    }
    return row;
  });
}
