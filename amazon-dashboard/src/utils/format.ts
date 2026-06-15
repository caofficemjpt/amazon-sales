/**
 * Format a number as Indian Rupee currency.
 * Uses Intl.NumberFormat with en-IN locale for proper Indian comma grouping.
 */
export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with Indian number grouping.
 */
export function formatIndian(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Format a percentage value.
 */
export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format any date string to DD-MM-YY HH:MM format.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  
  let date: Date;
  const cleanStr = String(dateStr).trim();
  
  // Try parsing DD-MM-YYYY HH:MM or DD-MM-YYYY
  const dmMatch = cleanStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10) - 1;
    const year = parseInt(dmMatch[3], 10);
    const hour = dmMatch[4] ? parseInt(dmMatch[4], 10) : 0;
    const min = dmMatch[5] ? parseInt(dmMatch[5], 10) : 0;
    date = new Date(year, month, day, hour, min);
  } else {
    date = new Date(cleanStr);
  }
  
  if (isNaN(date.getTime())) {
    return cleanStr;
  }
  
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  
  return `${dd}-${mm}-${yy} ${hh}:${min}`;
}
