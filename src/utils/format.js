/**
 * Formats a currency or numeric amount removing trailing '.00'.
 * Examples:
 *   1000.00 -> '1000'
 *   2450.00 -> '2450'
 *   12.50   -> '12.50'
 */
export function formatAmount(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Number(val);
  return num.toFixed(2).replace(/\.00$/, '');
}
