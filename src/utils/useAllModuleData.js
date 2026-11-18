"use client";

import { db, useLiveQuery } from '../db';
import { SYSTEM_MODULES } from './systemModules';

/**
 * Loads all non-deleted records for every system module in one live query.
 * Returns { [tableName]: records[] } or null while loading.
 */
export function useAllModuleData() {
  return useLiveQuery(async () => {
    const extraTables = ['sales_items', 'purchase_items', 'quotation_items', 'stock_movements', 'payment_vouchers'];
    const allTables = Array.from(new Set([...SYSTEM_MODULES.map(m => m.table), ...extraTables]));
    const entries = await Promise.all(
      allTables.map(async (tableName) => {
        if (!db[tableName]) return [tableName, []];
        const rows = await db[tableName].filter(r => !r.deleted_at).toArray();
        return [tableName, rows];
      })
    );
    return Object.fromEntries(entries);
  }, []);
}
