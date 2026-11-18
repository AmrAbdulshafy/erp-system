"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Cloud } from 'lucide-react';
import { db, useLiveQuery } from '../db';
import { useDialog } from './DialogProvider';
import { getApiHeaders } from '../utils/apiClient';

const SYNC_TABLES = [
  'employees',
  'users',
  'customers',
  'suppliers',
  'raw_materials',
  'quotations',
  'quotation_items',
  'sales_orders',
  'sales_items',
  'purchase_orders',
  'purchase_items',
  'work_orders',
  'employee_production',
  'attendance',
  'employee_loans',
  'payroll',
  'shipping_orders',
  'owner_withdrawals',
  'expenses',
  'stock_movements',
  'payment_vouchers'
];

const IMAGE_HEAVY_TABLES = new Set(['quotation_items', 'sales_items', 'purchase_items']);

export default function SyncButton() {
  const { t } = useTranslation();
  const dialog = useDialog();

  // Lightweight live query: counts pending rows using IndexedDB index without loading full objects/images into React state
  const pendingCount = useLiveQuery(async () => {
    const counts = await Promise.all(
      SYNC_TABLES.map(name =>
        db[name]
          ? db[name].where('sync_status').anyOf('PENDING', 'MODIFIED', 'DELETED').count()
          : 0
      )
    );
    return counts.reduce((sum, c) => sum + c, 0);
  }, [], 0);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState(0);

  const handleSync = async (isManual = false) => {
    if (isSyncing) return;

    setIsSyncing(true);
    let cloudSuccess = false;
    let failedTable = null;

    try {
      const pendingTables = [];
      for (const tableName of SYNC_TABLES) {
        if (!db[tableName]) continue;
        const rows = await db[tableName]
          .where('sync_status')
          .anyOf('PENDING', 'MODIFIED', 'DELETED')
          .toArray();
        if (rows.length > 0) {
          pendingTables.push([tableName, rows]);
        }
      }

      if (pendingTables.length === 0) {
        setIsSyncing(false);
        if (isManual) {
          dialog.alert({
            variant: 'success',
            message: t('sync_all_up_to_date') || 'All data is up to date and secured on this device (No pending changes).'
          });
        }
        return;
      }

      let reachedCloud = true;
      for (const [tableName, items] of pendingTables) {
        const chunkSize = IMAGE_HEAVY_TABLES.has(tableName) ? 5 : 20;
        const timeoutMs = IMAGE_HEAVY_TABLES.has(tableName) ? 20000 : 10000;

        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          let response;
          try {
            response = await fetch('/api/sync.php', {
              method: 'POST',
              headers: getApiHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ [tableName]: chunk }),
              signal: controller.signal
            });
          } catch {
            reachedCloud = false;
            failedTable = tableName;
            break;
          } finally {
            clearTimeout(timeoutId);
          }

          if (!response || !response.ok) {
            reachedCloud = false;
            failedTable = tableName;
            break;
          }

          const text = await response.text();
          let result;
          try {
            result = JSON.parse(text);
          } catch {
            reachedCloud = false;
            failedTable = tableName;
            break;
          }

          if (result && (result.status === 'success' || result.status === 'partial')) {
            const table = db[tableName];
            const syncedIds = Array.isArray(result.synced_ids?.[tableName])
              ? result.synced_ids[tableName]
              : (Number(result.failed_count || 0) === 0 ? chunk.map(item => item.id) : []);

            if (syncedIds.length > 0) {
              await table.bulkUpdate(syncedIds.map(id => ({
                key: id,
                changes: {
                  sync_status: 'SYNCED',
                  last_synced_at: new Date().toISOString(),
                  sync_mode: 'cloud'
                }
              })));
            }

            if (Number(result.failed_count || 0) > 0 || syncedIds.length < chunk.length) {
              reachedCloud = false;
              failedTable = tableName;
              break;
            }
          } else {
            reachedCloud = false;
            failedTable = tableName;
            break;
          }
        }
        if (!reachedCloud) break;
      }

      if (reachedCloud) {
        cloudSuccess = true;
      }
    } catch {
      cloudSuccess = false;
    }

    if (cloudSuccess) {
      try {
        localStorage.setItem('jinnworx_last_sync', new Date().toISOString());
        localStorage.setItem('jinnworx_sync_status', 'cloud');
      } catch {}

      if (isManual) {
        dialog.alert({
          variant: 'success',
          message: t('sync_cloud_success') || 'Sync successful! All records synchronized with the cloud database.'
        });
      }
    } else {
      // Cloud/MySQL unreachable: NEVER fake a successful sync.
      // Records stay PENDING so they upload automatically once the server is back.
      setLastErrorTime(Date.now());

      if (isManual) {
        const detail = failedTable ? ` (${failedTable})` : '';
        dialog.alert({
          variant: 'error',
          message:
            (t('sync_cloud_failed') || 'تعذّر الاتصال بالسيرفر — لم يتم رفع البيانات.') +
            detail +
            ' — ' +
            'البيانات ما زالت محفوظة محلياً، وأعد المحاولة بعد التأكد من تشغيل السيرفر. / Nothing was uploaded; records stay pending locally.'
        });
      }
    }

    setIsSyncing(false);
  };

  // Auto-sync mechanism with 30s failure backoff
  useEffect(() => {
    if (pendingCount > 0 && !isSyncing) {
      if (Date.now() - lastErrorTime < 30000) {
        // In cooldown period after error, don't spam
        return;
      }
      const timer = setTimeout(() => {
        handleSync(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pendingCount, isSyncing, lastErrorTime]);

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => handleSync(true)}
        disabled={isSyncing}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.85rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: pendingCount > 0 ? 'var(--accent)' : 'var(--surface-hover)',
          color: pendingCount > 0 ? '#ffffff' : 'var(--text-main)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: pendingCount > 0 ? '#ffffff' : '#06b6d4' }}>
          {isSyncing ? <RefreshCw size={16} className="spin" /> : <Cloud size={16} />}
        </div>
        <span>{t('sync_now')} {pendingCount > 0 && `(${pendingCount})`}</span>
        <style dangerouslySetInnerHTML={{__html: `
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}} />
      </button>
    </>
  );
}
