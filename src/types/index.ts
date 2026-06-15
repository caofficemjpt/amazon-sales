/* ==========================================
   TypeScript Interfaces for Amazon Dashboard
   ========================================== */

export interface Period {
  id: string;
  month: string;
  year: number;
  uploaded_at: string;
  row_count: number | null;
}

export interface ConsolidatedRecord {
  id: string;
  period_id: string;
  seller_gstn: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  transaction_type: string | null;
  order_id: string | null;
  order_date: string | null;
  item_description: string | null;
  sku: string | null;
  quantity: number | null;
  tax_exclusive_amount: number | null;
  total_tax_amount: number | null;
  invoice_amount: number | null;
  charges: number | null;
  tcs_igst: number | null;
  tds: number | null;
  promos: number | null;
  total: number | null;
  settlement_id: string | null;
  deposit_date: string | null;
  payment_type: string | null;
  fulfillment_channel: string | null;
  type: string | null;
}

export interface SettlementFee {
  id: string;
  period_id: string;
  order_id: string | null;
  sku: string | null;
  fee_type: string;
  fee_amount: number | null;
}

export interface UploadProgress {
  step: string;
  percent: number;
  log: string[];
}

/** Raw row from settlement TXT file (tab-separated) */
export interface SettlementRow {
  'settlement-id': string;
  'settlement-start-date': string;
  'settlement-end-date': string;
  'deposit-date': string;
  'total-amount': string;
  'currency': string;
  'transaction-type': string;
  'order-id': string;
  'merchant-order-id': string;
  'adjustment-id': string;
  'shipment-id': string;
  'marketplace-name': string;
  'amount-type': string;
  'amount-description': string;
  'amount': string;
  'fulfillment-id': string;
  'posted-date': string;
  'posted-date-time': string;
  'order-item-code': string;
  'merchant-order-item-id': string;
  'merchant-adjustment-item-id': string;
  'sku': string;
  'quantity-purchased': string;
  'price-type': string;
  'price-amount': number;
  'item-related-fee-type': string;
  'item-related-fee-amount': number;
  'misc-fee-amount': string;
  'other-fee-amount': string;
  'other-fee-reason-description': string;
  'promotion-id': string;
  'promotion-type': string;
  'promotion-amount': number;
  'direct-payment-type': string;
  'direct-payment-amount': string;
  'other-amount': number;
  [key: string]: string | number;
}

/** Raw row from MTR CSV */
export interface MTRRow {
  'Seller Gstin': string;
  'Invoice Number': string;
  'Invoice Date': string;
  'Transaction Type': string;
  'Order Id': string;
  'Order Date': string;
  'Item Description': string;
  'Sku': string;
  'Quantity': number;
  'Tax Exclusive Gross': number;
  'Total Tax Amount': number;
  'Invoice Amount': number;
  'Payment Method Code'?: string;
  'Fulfillment Channel'?: string;
  [key: string]: string | number | undefined;
}

/** Aggregated settlement data per order */
export interface SettlementSummary {
  orderId: string;
  charges: number;
  tcsIgst: number;
  tds: number;
  promos: number;
  settlementId: string;
  depositDate: string;
}

/** Final consolidated row before DB insert */
export interface ConsolidatedRowInput {
  period_id: string;
  seller_gstn: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  transaction_type: string | null;
  order_id: string | null;
  order_date: string | null;
  item_description: string | null;
  sku: string | null;
  quantity: number | null;
  tax_exclusive_amount: number | null;
  total_tax_amount: number | null;
  invoice_amount: number | null;
  charges: number | null;
  tcs_igst: number | null;
  tds: number | null;
  promos: number | null;
  total: number | null;
  settlement_id: string | null;
  deposit_date: string | null;
  payment_type: string | null;
  fulfillment_channel: string | null;
  type: string | null;
}

/** Settlement fee row for DB insert */
export interface SettlementFeeInput {
  period_id: string;
  order_id: string | null;
  sku: string | null;
  fee_type: string;
  fee_amount: number;
}

/** Log entry for upload UI */
export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

/** Toast notification */
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/** KPI card color variant */
export type KpiColor = 'default' | 'danger' | 'success' | 'warning';

/** Trend direction */
export type Trend = 'up' | 'down' | 'neutral';
