"use client";

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Package, Activity, ArrowDownLeft, ArrowUpRight, RefreshCw, Search, Printer } from 'lucide-react';
import DynamicCRUD from '../../components/DynamicCRUD';
import { db } from '../../db';
import { formatAmount } from '../../utils/format';

export default function Inventory() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const schema = [
    { key: 'category', label: 'category', type: 'select', options: ['paper_roll', 'plastic_roll', 'ink', 'carton', 'lids', 'other'], required: true, allowCustom: true },
    { key: 'material_name', label: 'material_name', type: 'text', required: true },
    { key: 'supplier_id', label: 'supplier', type: 'relation', relationTable: 'suppliers', relationLabel: 'supplier_name' },
    { key: 'size', label: 'size', type: 'dimensions' },
    { key: 'thickness_gsm', label: 'thickness_gsm', type: 'thickness' },
    { key: 'color_print', label: 'color_print', type: 'color_palette' },
    { key: 'unit', label: 'unit', type: 'select', options: ['kg', 'liter', 'piece', 'roll', 'ton', 'box', 'meter', 'sheet'], required: true, allowCustom: true },
    { key: 'stock_quantity', label: 'stock_quantity', type: 'number', required: true, showTotal: true },
    { key: 'unit_price', label: 'stock_unit_price', type: 'number', isCurrency: true },
    { key: 'sales_unit_price', label: 'sales_unit_price', type: 'number', isCurrency: true },
    { key: 'consumption_per_unit', label: 'consumption_per_unit', type: 'number' },
    { key: 'min_stock_alert', label: 'min_stock_alert', type: 'number', required: true }
  ];

  const movementsData = useLiveQuery(async () => {
    const materials = await db.raw_materials?.filter(m => !m.deleted_at).toArray() ?? [];
    const matMap = new Map(materials.map(m => [m.id, m]));
    const tableMovs = await db.stock_movements?.filter(m => !m.deleted_at).toArray() ?? [];

    const combined = [...tableMovs.map(m => ({
      ...m,
      material_name: m.material_name || matMap.get(m.material_id)?.material_name || m.material_id,
      unit: matMap.get(m.material_id)?.unit || ''
    }))];

    // Include any legacy embedded movements not yet in stock_movements table
    const existingRefs = new Set(combined.map(m => `${m.material_id}-${m.created_at}`));
    for (const mat of materials) {
      if (Array.isArray(mat.stock_movements)) {
        for (const em of mat.stock_movements) {
          const key = `${mat.id}-${em.created_at}`;
          if (existingRefs.has(key)) continue;
          const isRevert = em.source === 'work_order_bom_revert' || Number(em.restored_quantity) > 0;
          const qty = isRevert ? (Number(em.restored_quantity) || 0) : (Number(em.deducted_quantity) || 0);
          if (qty <= 0) continue;
          combined.push({
            id: `emb-${key}`,
            material_id: mat.id,
            material_name: mat.material_name,
            unit: mat.unit || '',
            movement_type: isRevert ? 'IN' : 'OUT',
            source: em.source || 'work_order_bom',
            reference_type: 'work_order',
            reference_id: em.work_order_id || null,
            quantity: qty,
            direction: isRevert ? 1 : -1,
            stock_before: Number(em.stock_before) || 0,
            stock_after: Number(em.stock_after) || 0,
            unit_cost: Number(mat.unit_price) || 0,
            movement_date: (em.created_at || '').split('T')[0],
            notes: isRevert ? 'إرجاع خامات أمر شغل' : 'سحب تصنيع أمر شغل (BOM)',
            created_at: em.created_at || ''
          });
        }
      }
    }

    return combined.sort((a, b) => String(b.created_at || b.movement_date || '').localeCompare(String(a.created_at || a.movement_date || '')));
  }, [], []);

  const filteredMovements = useMemo(() => {
    return (movementsData || []).filter(m => {
      if (sourceFilter === 'IN' && m.direction < 0) return false;
      if (sourceFilter === 'OUT_SALES' && m.source !== 'sales_order') return false;
      if (sourceFilter === 'OUT_BOM' && m.source !== 'work_order_bom') return false;
      if (sourceFilter === 'PURCHASE' && m.source !== 'purchase_order') return false;
      if (sourceFilter === 'ADJUSTMENT' && m.movement_type !== 'ADJUSTMENT' && m.source !== 'initial_stock') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = String(m.material_name || '').toLowerCase().includes(q);
        const matchNotes = String(m.notes || '').toLowerCase().includes(q);
        const matchRef = String(m.reference_id || '').toLowerCase().includes(q);
        return matchName || matchNotes || matchRef;
      }
      return true;
    });
  }, [movementsData, sourceFilter, searchQuery]);

  const stats = useMemo(() => {
    const list = movementsData || [];
    const totalIn = list.filter(m => m.direction > 0).reduce((s, m) => s + (Number(m.quantity) || 0), 0);
    const totalOutSales = list.filter(m => m.source === 'sales_order').reduce((s, m) => s + (Number(m.quantity) || 0), 0);
    const totalOutBom = list.filter(m => m.source === 'work_order_bom').reduce((s, m) => s + (Number(m.quantity) || 0), 0);
    return { count: list.length, totalIn, totalOutSales, totalOutBom };
  }, [movementsData]);

  const getSourceBadge = (m) => {
    const src = m.source || '';
    if (src === 'purchase_order') {
      return { label: isRTL ? 'وارد مشتريات' : 'Purchase In', bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981' };
    }
    if (src === 'sales_order') {
      return { label: isRTL ? 'صرف فاتورة مبيعات' : 'Sales Out', bg: 'rgba(239, 68, 68, 0.14)', color: '#ef4444' };
    }
    if (src === 'work_order_bom') {
      return { label: isRTL ? 'سحب تصنيع (BOM)' : 'BOM Consumption', bg: 'rgba(249, 115, 22, 0.14)', color: '#f97316' };
    }
    if (src === 'initial_stock') {
      return { label: isRTL ? 'رصيد افتتاحي' : 'Initial Stock', bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6' };
    }
    if (src.includes('revert')) {
      return { label: isRTL ? 'عكس / إرجاع حركة' : 'Reversal', bg: 'rgba(139, 92, 246, 0.14)', color: '#8b5cf6' };
    }
    return { label: isRTL ? 'تسوية جردية' : 'Stock Adjustment', bg: 'rgba(100, 116, 139, 0.14)', color: '#64748b' };
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Top Tab Switcher */}
      <div className="hide-on-print" style={{
        display: 'flex',
        gap: '0.6rem',
        marginBottom: '1.25rem',
        padding: '0.4rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        width: 'fit-content'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            background: activeTab === 'stock' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'stock' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={17} />
          <span>{isRTL ? 'أرصدة المخزن والخامات' : 'Warehouse Stock'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            background: activeTab === 'movements' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'movements' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Activity size={17} />
          <span>{isRTL ? `سجل حركة المخزون (${stats.count})` : `Stock Movements Log (${stats.count})`}</span>
        </button>
      </div>

      {activeTab === 'stock' ? (
        <DynamicCRUD tableName="raw_materials" title={t('inventory')} schema={schema} />
      ) : (
        <div className="print-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
                {isRTL ? 'سجل حركة المخزون التفصيلي' : 'Warehouse Stock Movements Log'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                {isRTL
                  ? 'تتبع كامل لكل حركة وارد (مشتريات / رصيد افتتاحي) ومنصرف (مبيعات / استهلاك أوامر الشغل BOM / تسويات)'
                  : 'Complete ledger of all incoming purchases, sales deductions, BOM manufacturing consumption, and adjustments'}
              </p>
            </div>
            <button
              type="button"
              className="btn hide-on-print"
              onClick={() => window.print()}
              style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)' }}
            >
              <Printer size={17} /> {isRTL ? 'طباعة سجل الحركات' : 'Print Movements Log'}
            </button>
          </div>

          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                {isRTL ? 'إجمالي الحركات المسجلة' : 'Total Movements'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {stats.count}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                {isRTL ? 'إجمالي الكميات الواردة (+)' : 'Total Incoming (+)'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                +{formatAmount(stats.totalIn)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                {isRTL ? 'منصرف فواتير المبيعات (-)' : 'Sales Outflow (-)'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                -{formatAmount(stats.totalOutSales)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                {isRTL ? 'استهلاك التصنيع وأوامر الشغل (BOM)' : 'BOM Consumption (-)'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>
                -{formatAmount(stats.totalOutBom)}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            {/* Search & Filters */}
            <div className="hide-on-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: '0.85rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={isRTL ? 'بحث باسم الخامة أو رقم المرجع أو البيان...' : 'Search by material name, reference, or notes...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingInlineStart: '2.4rem', width: '100%' }}
                />
              </div>

              <select
                className="form-input"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '200px' }}
              >
                <option value="ALL">{isRTL ? 'كل أنواع الحركات' : 'All Movement Types'}</option>
                <option value="PURCHASE">{isRTL ? 'وارد مشتريات فقط' : 'Purchases In Only'}</option>
                <option value="OUT_SALES">{isRTL ? 'منصرف مبيعات فقط' : 'Sales Out Only'}</option>
                <option value="OUT_BOM">{isRTL ? 'استهلاك تصنيع (BOM) فقط' : 'BOM Consumption Only'}</option>
                <option value="ADJUSTMENT">{isRTL ? 'تسويات جردية وأرصدة افتتاحية' : 'Adjustments & Initial'}</option>
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th>{isRTL ? 'الصنف / الخامة' : 'Material'}</th>
                    <th>{isRTL ? 'نوع الحركة' : 'Type'}</th>
                    <th>{isRTL ? 'الكمية' : 'Quantity'}</th>
                    <th>{isRTL ? 'الرصيد قبل' : 'Stock Before'}</th>
                    <th>{isRTL ? 'الرصيد بعد' : 'Stock After'}</th>
                    <th>{isRTL ? 'المرجع / البيان' : 'Reference & Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        {isRTL ? 'لا توجد حركات مخزون مطابقة للبحث' : 'No stock movements found'}
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const badge = getSourceBadge(m);
                      const isIn = m.direction > 0;
                      return (
                        <tr key={m.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                            {m.movement_date || (m.created_at || '').split('T')[0] || '—'}
                          </td>
                          <td style={{ fontWeight: 700 }}>{m.material_name || '—'}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.color
                            }}>
                              {isIn ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                              {badge.label}
                            </span>
                          </td>
                          <td style={{
                            fontWeight: 800,
                            color: isIn ? '#10b981' : '#ef4444',
                            direction: 'ltr',
                            textAlign: isRTL ? 'right' : 'left'
                          }}>
                            {isIn ? '+' : '-'}{formatAmount(m.quantity)} {m.unit || ''}
                          </td>
                          <td>{formatAmount(m.stock_before)}</td>
                          <td style={{ fontWeight: 700 }}>{formatAmount(m.stock_after)}</td>
                          <td style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                            {m.notes || (m.reference_id ? `#${String(m.reference_id).slice(0, 8).toUpperCase()}` : '—')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
