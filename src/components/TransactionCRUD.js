"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit3, Trash2, ArrowLeft, Save, PlusCircle, Printer, Image as ImageIcon, X, Search, Sparkles, Filter, FileText, Check } from 'lucide-react';
import { useDialog } from './DialogProvider';
import { formatAmount } from '../utils/format';
import ImageModal from './ImageModal';
import EntityProfileModal, { ProfileLink } from './EntityProfileModal';
import RecordDetailModal from './RecordDetailModal';
import { TABLE_TO_ENTITY_TYPE } from '../utils/profileConstants';
import PageMetricCards from './PageMetricCards';
import { computeTableMetrics } from '../utils/tableMetrics';
import { useCompanyProfile } from '../utils/companyProfile';
import {
  recordStockMovement,
  getAlreadyDeductedByWorkOrderForSalesOrder,
  generateNextVoucherNumber,
  getEffectiveMaterialRate,
  prepareSalesOrderDeleteStockRestore,
  syncInvoiceVouchersOnPaidReduction
} from '../utils/inventoryMovements';

export default function TransactionCRUD({ 
  headerTable, 
  itemsTable, 
  title, 
  headerSchema, 
  foreignKeyName = 'transaction_id',
  customActions = [],
  customCards
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dialog = useDialog();
  const { getDisplayName } = useCompanyProfile();
  const [headers, setHeaders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [currentHeader, setCurrentHeader] = useState(null);
  const [currentItems, setCurrentItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [relations, setRelations] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null); // { type, id }
  const [viewDetailRecord, setViewDetailRecord] = useState(null);
  const [viewDetailItems, setViewDetailItems] = useState([]);

  const loadData = async () => {
    const rawHeaders = await db[headerTable].filter(r => !r.deleted_at).toArray();
    setHeaders(rawHeaders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
  };

  const loadRelations = async () => {
    const inv = await db.raw_materials.filter(r => !r.deleted_at).toArray();
    setInventory(inv);

    const rels = {};
    for (const field of headerSchema) {
      if (field.type === 'relation') {
        const data = await db[field.relationTable].filter(r => !r.deleted_at).toArray();
        rels[field.key] = data;
      }
    }
    setRelations(rels);
  };

  useEffect(() => {
    const timer = setTimeout(() => setSelectedIds([]), 0);
    return () => clearTimeout(timer);
  }, [headerTable]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
      loadRelations();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const getRelationLabel = (field, id) => {
    if (!relations[field.key]) return id;
    const rec = relations[field.key].find(r => r.id === id);
    if (!rec) return id;
    if (field.relationLabel === 'id') {
      return `${t(field.label)} #${String(rec.id).slice(0, 8).toUpperCase()}`;
    }
    return rec[field.relationLabel] || id;
  };

  const filteredHeaders = useMemo(() => {
    if (!searchQuery.trim()) return headers;
    const q = searchQuery.toLowerCase().trim();
    return headers.filter(record => {
      // 1. Direct field match
      const directMatch = Object.values(record).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(q));
      if (directMatch) return true;
      // 2. Relation lookup match
      for (const field of headerSchema) {
        if (field.type === 'relation' && record[field.key]) {
          const label = getRelationLabel(field, record[field.key]);
          if (label && String(label).toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }, [headers, searchQuery, headerSchema, relations]);

  const resolveItemMaterialId = async (item, nameToMaterialMap) => {
    if (item.material_id) return item.material_id;
    if (item.raw_material_id) {
      if (item.id) {
        await db[itemsTable].update(item.id, { material_id: item.raw_material_id });
      }
      return item.raw_material_id;
    }
    if (item.product_name) {
      let map = nameToMaterialMap;
      if (!map) {
        const allMats = await db.raw_materials.filter(r => !r.deleted_at).toArray();
        map = new Map(allMats.map(m => [m.material_name, m]));
      }
      const matched = map.get(item.product_name);
      if (matched) {
        if (item.id) {
          await db[itemsTable].update(item.id, {
            material_id: matched.id,
            raw_material_id: matched.id
          });
        }
        return matched.id;
      }
    }
    return null;
  };

  const applyStockDelta = async (items, direction, referenceId = null, movementDate = null, isRevert = false) => {
    if (!items || items.length === 0) return;

    let nameToMaterialMap = null;
    const totalsByMaterial = new Map();

    for (const item of items) {
      let matId = item.material_id;
      if (!matId) {
        if (!nameToMaterialMap) {
          const allMats = await db.raw_materials.filter(r => !r.deleted_at).toArray();
          nameToMaterialMap = new Map(allMats.map(m => [m.material_name, m]));
        }
        matId = await resolveItemMaterialId(item, nameToMaterialMap);
      }
      if (!matId) continue;

      const qty = Number(item.quantity) || 0;
      if (qty === 0) continue;
      totalsByMaterial.set(matId, (totalsByMaterial.get(matId) || 0) + qty);
    }

    // Prevent double deduction if a linked Work Order BOM already deducted this material for this Sales Order
    let woAlreadyDeducted = new Map();
    if (headerTable === 'sales_orders' && referenceId && !isRevert) {
      woAlreadyDeducted = await getAlreadyDeductedByWorkOrderForSalesOrder(referenceId);
    }

    const now = new Date().toISOString();
    for (const [materialId, rawTotalQty] of totalsByMaterial.entries()) {
      if (rawTotalQty === 0) continue;

      let totalQty = rawTotalQty;
      if (headerTable === 'sales_orders' && direction === -1 && totalQty > 0 && woAlreadyDeducted.has(materialId)) {
        const coveredByWO = Math.min(totalQty, Number(woAlreadyDeducted.get(materialId)) || 0);
        totalQty = Math.max(0, totalQty - coveredByWO);
        if (totalQty === 0) continue;
      }

      const mat = await db.raw_materials.get(materialId);
      if (!mat) continue;

      const currentStock = Number(mat.stock_quantity) || 0;
      const netDelta = totalQty * direction;
      const newStock = currentStock + netDelta;

      if (headerTable === 'sales_orders' && direction === -1 && newStock < 0) {
        throw new Error(`الرصيد المتاح من ${mat.material_name} هو ${currentStock} فقط`);
      }

      await db.raw_materials.update(materialId, {
        stock_quantity: newStock,
        updated_at: now,
        sync_status: 'PENDING'
      });

      const refType = headerTable === 'sales_orders' ? 'sales_order' : 'purchase_order';
      const sourceType = isRevert
        ? `${refType}_revert`
        : refType;
      const shortRef = referenceId ? `#${String(referenceId).slice(0, 8).toUpperCase()}` : '';
      const noteLabel = headerTable === 'sales_orders'
        ? (isRevert ? `إرجاع مخزون حذف/تعديل فاتورة مبيعات ${shortRef}` : `صرف فاتورة مبيعات ${shortRef}`)
        : (isRevert ? `عكس وارد حذف/تعديل أمر شراء ${shortRef}` : `وارد مشتريات خامات ${shortRef}`);

      await recordStockMovement({
        material_id: materialId,
        material_name: mat.material_name,
        movement_type: netDelta >= 0 ? 'IN' : 'OUT',
        source: sourceType,
        reference_type: refType,
        reference_id: referenceId,
        quantity: Math.abs(netDelta),
        direction: netDelta >= 0 ? 1 : -1,
        stock_before: currentStock,
        stock_after: newStock,
        unit_cost: Number(mat.unit_price) || 0,
        movement_date: movementDate || now.split('T')[0],
        notes: noteLabel
      });
    }
  };

  const handleAddNew = () => {
    loadRelations();
    const defaultHeader = { 
      id: uuidv4(), 
      subtotal: 0, 
      discount_amount: 0, 
      discount_percent: 0, 
      total_amount: 0, 
      amount_paid: 0, 
      remaining_amount: 0, 
      payment_status: 'UNPAID' 
    };
    headerSchema.forEach(f => {
      if (f.type === 'number') defaultHeader[f.key] = 0;
      else if (f.type === 'date') defaultHeader[f.key] = new Date().toISOString().split('T')[0];
      else if (f.key === 'payment_status') defaultHeader[f.key] = 'UNPAID';
      else if (defaultHeader[f.key] === undefined) defaultHeader[f.key] = '';
    });
    setCurrentHeader(defaultHeader);
    setCurrentItems([]);
    setView('form');
  };

  const handleEdit = async (header) => {
    setCurrentHeader(header);
    const allMats = await db.raw_materials.filter(r => !r.deleted_at).toArray();
    setInventory(allMats);
    const nameMap = new Map(allMats.map(m => [m.material_name, m]));
    const idMap = new Map(allMats.map(m => [m.id, m]));

    const items = await db[itemsTable].where(foreignKeyName).equals(header.id).toArray();
    const activeItems = items.filter(i => !i.deleted_at);
    const normalizedItems = [];

    for (const item of activeItems) {
      const matId = await resolveItemMaterialId(item, nameMap);
      const matchedMat = matId ? idMap.get(matId) : null;
      normalizedItems.push({
        ...item,
        material_id: matId || '',
        raw_material_id: matId || item.raw_material_id || '',
        product_name: item.product_name || matchedMat?.material_name || ''
      });
    }

    setCurrentItems(normalizedItems);
    setView('form');
  };

  const handleViewRecord = async (record) => {
    try {
      const items = await db[itemsTable].where(foreignKeyName).equals(record.id).toArray();
      const activeItems = items.filter(i => !i.deleted_at);
      const invMap = Object.fromEntries(inventory.map(m => [m.id, m.material_name]));
      const enrichedItems = activeItems.map(item => ({
        ...item,
        material_name: invMap[item.material_id || item.raw_material_id] || item.product_name || item.name || item.material_id || item.raw_material_id
      }));
      setViewDetailItems(enrichedItems);
    } catch (e) {
      console.error("Error loading items for detail card", e);
      setViewDetailItems([]);
    }
    setViewDetailRecord(record);
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      variant: 'danger',
      title: t('delete_transaction_title'),
      message: t('confirm_delete_transaction'),
    });
    if (ok) {
      try {
        const txTables = [db[headerTable], db[itemsTable], db.raw_materials, db.expenses, db.suppliers, db.customers, db.stock_movements, db.payment_vouchers, db.work_orders].filter(Boolean);
        await db.transaction('rw', txTables, async () => {
          const now = new Date().toISOString();
          const items = await db[itemsTable].where(foreignKeyName).equals(id).toArray();
          const activeItems = items.filter(i => !i.deleted_at);

          // Revert stock quantities (opposite direction) before soft-deleting
          if (headerTable === 'sales_orders') {
            const netRestoreMap = await prepareSalesOrderDeleteStockRestore(id, now);
            const restoreItems = [];
            for (const [matId, restoreQty] of netRestoreMap.entries()) {
              if (restoreQty > 0) {
                restoreItems.push({ material_id: matId, quantity: restoreQty });
              }
            }
            if (restoreItems.length > 0) {
              await applyStockDelta(restoreItems, 1, id, now.split('T')[0], true);
            }
          } else if (headerTable === 'purchase_orders') {
            await applyStockDelta(activeItems, -1, id, now.split('T')[0], true);
          }

          // Read header before soft-deleting so we have its remaining amount
          const headerToDelete = await db[headerTable].get(id);
          const wasActive = headerToDelete && !headerToDelete.deleted_at;

          await db[headerTable].update(id, { deleted_at: now, sync_status: 'PENDING' });
          for (const item of activeItems) {
            await db[itemsTable].update(item.id, { deleted_at: now, sync_status: 'PENDING' });
          }

          // Soft-delete any payment_vouchers linked to this invoice
          if (db.payment_vouchers && (headerTable === 'sales_orders' || headerTable === 'purchase_orders')) {
            const linkedVouchers = await db.payment_vouchers
              .where('reference_id')
              .equals(id)
              .filter(v => !v.deleted_at)
              .toArray();
            for (const vch of linkedVouchers) {
              await db.payment_vouchers.update(vch.id, { deleted_at: now, sync_status: 'PENDING' });
            }
          }

          // If a Purchase Order is deleted, soft-delete its linked expense and subtract remaining from supplier balance
          if (headerTable === 'purchase_orders') {
            const linkedExpenses = await db.expenses.filter(e => !e.deleted_at && e.notes && e.notes.includes(`[PO:${id}]`)).toArray();
            for (const exp of linkedExpenses) {
              await db.expenses.update(exp.id, { deleted_at: now, sync_status: 'PENDING' });
            }
            if (wasActive && headerToDelete.supplier_id) {
              const deletedRemaining = (Number(headerToDelete.total_amount) || 0) - (Number(headerToDelete.amount_paid) || 0);
              const supplier = await db.suppliers.get(headerToDelete.supplier_id);
              if (supplier) {
                const currentBalance = Number(supplier.account_balance) || 0;
                await db.suppliers.update(headerToDelete.supplier_id, {
                  account_balance: currentBalance - deletedRemaining,
                  updated_at: now,
                  sync_status: 'PENDING'
                });
              }
            }
          }

          // If a Sales Order is deleted, subtract remaining from customer balance and soft-delete linked shipping expenses
          if (headerTable === 'sales_orders') {
            const soLinkedExpenses = await db.expenses
              .filter(e => !e.deleted_at && e.notes && e.notes.includes(`[SO:${id}]`))
              .toArray();
            for (const exp of soLinkedExpenses) {
              await db.expenses.update(exp.id, { deleted_at: now, sync_status: 'PENDING' });
            }

            if (wasActive && headerToDelete.customer_id) {
              const deletedRemaining = (Number(headerToDelete.total_amount) || 0) - (Number(headerToDelete.amount_paid) || 0);
              const customer = await db.customers.get(headerToDelete.customer_id);
              if (customer) {
                const currentBalance = Number(customer.account_balance) || 0;
                await db.customers.update(headerToDelete.customer_id, {
                  account_balance: currentBalance - deletedRemaining,
                  updated_at: now,
                  sync_status: 'PENDING'
                });
              }
            }
          }
        });

        await loadData();
        await loadRelations();
        setSelectedIds(prev => prev.filter(selId => selId !== id));
      } catch (err) {
        console.error('Delete transaction failed:', err);
        dialog.alert({ variant: 'error', message: err?.message || (isRTL ? 'فشل حذف الفاتورة' : 'Failed to delete transaction') });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await dialog.confirm({
      variant: 'danger',
      title: isRTL ? 'حذف السجلات المحددة' : 'Bulk Delete Records',
      message: isRTL 
        ? `هل أنت متأكد من رغبتك في حذف ${count} سجل محدد من جدول (${title})؟` 
        : `Are you sure you want to delete ${count} selected records from ${title}?`
    });
    if (!ok) return;

    try {
      const txTables = [db[headerTable], db[itemsTable], db.raw_materials, db.expenses, db.suppliers, db.customers, db.stock_movements, db.payment_vouchers, db.work_orders].filter(Boolean);
      await db.transaction('rw', txTables, async () => {
        const now = new Date().toISOString();
        for (const id of selectedIds) {
          const items = await db[itemsTable].where(foreignKeyName).equals(id).toArray();
          const activeItems = items.filter(i => !i.deleted_at);

          if (headerTable === 'sales_orders') {
            const netRestoreMap = await prepareSalesOrderDeleteStockRestore(id, now);
            const restoreItems = [];
            for (const [matId, restoreQty] of netRestoreMap.entries()) {
              if (restoreQty > 0) {
                restoreItems.push({ material_id: matId, quantity: restoreQty });
              }
            }
            if (restoreItems.length > 0) {
              await applyStockDelta(restoreItems, 1, id, now.split('T')[0], true);
            }
          } else if (headerTable === 'purchase_orders') {
            await applyStockDelta(activeItems, -1, id, now.split('T')[0], true);
          }

          const headerToDelete = await db[headerTable].get(id);
          const wasActive = headerToDelete && !headerToDelete.deleted_at;

          await db[headerTable].update(id, { deleted_at: now, sync_status: 'PENDING' });
          for (const item of activeItems) {
            await db[itemsTable].update(item.id, { deleted_at: now, sync_status: 'PENDING' });
          }

          if (db.payment_vouchers && (headerTable === 'sales_orders' || headerTable === 'purchase_orders')) {
            const linkedVouchers = await db.payment_vouchers
              .where('reference_id')
              .equals(id)
              .filter(v => !v.deleted_at)
              .toArray();
            for (const vch of linkedVouchers) {
              await db.payment_vouchers.update(vch.id, { deleted_at: now, sync_status: 'PENDING' });
            }
          }

          if (headerTable === 'purchase_orders') {
            const linkedExpenses = await db.expenses.filter(e => !e.deleted_at && e.notes && e.notes.includes(`[PO:${id}]`)).toArray();
            for (const exp of linkedExpenses) {
              await db.expenses.update(exp.id, { deleted_at: now, sync_status: 'PENDING' });
            }
            if (wasActive && headerToDelete.supplier_id) {
              const deletedRemaining = (Number(headerToDelete.total_amount) || 0) - (Number(headerToDelete.amount_paid) || 0);
              const supplier = await db.suppliers.get(headerToDelete.supplier_id);
              if (supplier) {
                const currentBalance = Number(supplier.account_balance) || 0;
                await db.suppliers.update(headerToDelete.supplier_id, {
                  account_balance: currentBalance - deletedRemaining,
                  updated_at: now,
                  sync_status: 'PENDING'
                });
              }
            }
          }

          if (headerTable === 'sales_orders') {
            const soLinkedExpenses = await db.expenses
              .filter(e => !e.deleted_at && e.notes && e.notes.includes(`[SO:${id}]`))
              .toArray();
            for (const exp of soLinkedExpenses) {
              await db.expenses.update(exp.id, { deleted_at: now, sync_status: 'PENDING' });
            }

            if (wasActive && headerToDelete.customer_id) {
              const deletedRemaining = (Number(headerToDelete.total_amount) || 0) - (Number(headerToDelete.amount_paid) || 0);
              const customer = await db.customers.get(headerToDelete.customer_id);
              if (customer) {
                const currentBalance = Number(customer.account_balance) || 0;
                await db.customers.update(headerToDelete.customer_id, {
                  account_balance: currentBalance - deletedRemaining,
                  updated_at: now,
                  sync_status: 'PENDING'
                });
              }
            }
          }
        }
      });

      setSelectedIds([]);
      await loadData();
      await loadRelations();
    } catch (err) {
      console.error('Bulk delete failed:', err);
      dialog.alert({ variant: 'error', message: err?.message || (isRTL ? 'فشل حذف السجلات المحددة' : 'Failed to delete selected records') });
    }
  };

  const handleSave = async () => {
    // Calculate subtotal, discount, total & remaining amount
    const subtotal = currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    const discAmount = Number(currentHeader.discount_amount) || 0;
    const discPercent = Number(currentHeader.discount_percent) || 0;
    const total = Math.max(0, subtotal - discAmount);
    const paid = Number(currentHeader.amount_paid) || 0;
    const newRemaining = total - paid;

    let status = currentHeader.payment_status;
    if (total > 0 && (!status || status === 'UNPAID' || status === 'PAID' || status === 'PARTIAL')) {
      if (paid >= total) status = 'PAID';
      else if (paid > 0) status = 'PARTIAL';
      else status = 'UNPAID';
    }

    const now = new Date().toISOString();
    const headerToSave = { 
      ...currentHeader, 
      subtotal: subtotal,
      discount_amount: discAmount,
      discount_percent: discPercent,
      total_amount: total, 
      remaining_amount: newRemaining,
      payment_status: status || currentHeader.payment_status || 'UNPAID',
      updated_at: now, 
      sync_status: 'PENDING' 
    };
    if (!headerToSave.created_at) headerToSave.created_at = now;

    try {
      const txTables = [db[headerTable], db[itemsTable], db.raw_materials, db.expenses, db.suppliers, db.customers, db.stock_movements, db.payment_vouchers, db.work_orders].filter(Boolean);
      await db.transaction('rw', txTables, async () => {
        // Record old invoice remaining amount before saving
        const oldHeader = await db[headerTable].get(headerToSave.id);
        const hasActiveOldHeader = Boolean(oldHeader && !oldHeader.deleted_at);
        const oldPaidAmount = hasActiveOldHeader ? (Number(oldHeader.amount_paid) || 0) : 0;
        const oldRemaining = hasActiveOldHeader
          ? ((Number(oldHeader.total_amount) || 0) - oldPaidAmount)
          : 0;

        const allMats = await db.raw_materials.filter(r => !r.deleted_at).toArray();
        const nameToMatMap = new Map(allMats.map(m => [m.material_name, m]));
        const idToMatMap = new Map(allMats.map(m => [m.id, m]));

        // Read existing active items (without deleted_at)
        const existing = await db[itemsTable].where(foreignKeyName).equals(headerToSave.id).toArray();
        const activeOldItems = existing.filter(ex => !ex.deleted_at);

        // Resolve material_id for old items (fallback by name once and update item)
        const oldQtyByMaterial = new Map();
        for (const oldItem of activeOldItems) {
          const matId = await resolveItemMaterialId(oldItem, nameToMatMap);
          if (matId) {
            const matRecord = idToMatMap.get(matId);
            const rate = headerTable === 'sales_orders'
              ? getEffectiveMaterialRate(matRecord, oldItem.consumption_per_unit)
              : 1;
            oldQtyByMaterial.set(matId, (oldQtyByMaterial.get(matId) || 0) + ((Number(oldItem.quantity) || 0) * rate));
          }
        }

        // Resolve material_id for new items and calculate new quantities per material
        const preparedNewItems = [];
        const newQtyByMaterial = new Map();
        for (const item of currentItems) {
          let matId = item.material_id || item.raw_material_id || null;
          if (!matId && item.product_name) {
            const matched = nameToMatMap.get(item.product_name);
            if (matched) matId = matched.id;
          }
          const matRecord = matId ? idToMatMap.get(matId) : null;
          const prodName = item.product_name || matRecord?.material_name || '';

          if (matId) {
            const rate = headerTable === 'sales_orders'
              ? getEffectiveMaterialRate(matRecord, item.consumption_per_unit)
              : 1;
            newQtyByMaterial.set(matId, (newQtyByMaterial.get(matId) || 0) + ((Number(item.quantity) || 0) * rate));
          }

          preparedNewItems.push({
            ...item,
            id: item.id || uuidv4(),
            [foreignKeyName]: headerToSave.id,
            material_id: matId,
            raw_material_id: matId,
            product_name: prodName,
            created_at: item.created_at || now,
            updated_at: now,
            deleted_at: null,
            sync_status: 'PENDING'
          });
        }

        // Process stock delta (newQty - oldQty) only
        if (headerTable === 'sales_orders' || headerTable === 'purchase_orders') {
          const allMaterialIds = new Set([...oldQtyByMaterial.keys(), ...newQtyByMaterial.keys()]);
          const deltaItems = [];
          for (const matId of allMaterialIds) {
            const diffQty = (newQtyByMaterial.get(matId) || 0) - (oldQtyByMaterial.get(matId) || 0);
            if (diffQty !== 0) {
              deltaItems.push({ material_id: matId, quantity: diffQty });
            }
          }
          const direction = headerTable === 'sales_orders' ? -1 : 1;
          await applyStockDelta(deltaItems, direction, headerToSave.id, headerToSave.order_date || now.split('T')[0], false);
          if (headerTable === 'sales_orders') {
            headerToSave.stock_deducted = true;
          }
        }

        // Save header
        await db[headerTable].put(headerToSave);

        // Soft-delete existing items and put new items
        for (const ex of activeOldItems) {
          await db[itemsTable].update(ex.id, { deleted_at: now, sync_status: 'PENDING' });
        }
        for (const itemToSave of preparedNewItems) {
          await db[itemsTable].put(itemToSave);
        }

        // Record/update official Payment Voucher (سند قبض / سند صرف) when paid amount changes
        if (db.payment_vouchers && (headerTable === 'sales_orders' || headerTable === 'purchase_orders')) {
          const paidDelta = paid - oldPaidAmount;
          const isSales = headerTable === 'sales_orders';
          const vType = isSales ? 'RECEIPT' : 'PAYMENT';
          const eType = isSales ? 'customer' : 'supplier';
          const eId = isSales ? headerToSave.customer_id : headerToSave.supplier_id;
          let eName = '';
          if (eId) {
            const ent = isSales ? await db.customers.get(eId) : await db.suppliers.get(eId);
            eName = isSales ? (ent?.customer_name || '') : (ent?.supplier_name || '');
          }

          if (!hasActiveOldHeader && paid > 0) {
            const vNum = await generateNextVoucherNumber(vType);
            await db.payment_vouchers.put({
              id: `vch-${isSales ? 'so' : 'po'}-init-${headerToSave.id}`,
              voucher_number: vNum,
              voucher_type: vType,
              entity_type: eType,
              entity_id: eId || null,
              entity_name: eName,
              reference_type: isSales ? 'sales_order' : 'purchase_order',
              reference_id: headerToSave.id,
              amount: paid,
              payment_method: 'CASH',
              voucher_date: headerToSave.order_date || now.split('T')[0],
              notes: isSales
                ? `دفعة مقدمة على فاتورة مبيعات #${String(headerToSave.id).slice(0, 8).toUpperCase()}`
                : `دفعة مسددة على أمر شراء #${String(headerToSave.id).slice(0, 8).toUpperCase()}`,
              sync_status: 'PENDING',
              created_at: now,
              updated_at: now,
              deleted_at: null
            });
          } else if (hasActiveOldHeader && Math.abs(paidDelta) > 0.001) {
            if (paidDelta > 0) {
              const vNum = await generateNextVoucherNumber(vType);
              await db.payment_vouchers.put({
                id: uuidv4(),
                voucher_number: vNum,
                voucher_type: vType,
                entity_type: eType,
                entity_id: eId || null,
                entity_name: eName,
                reference_type: isSales ? 'sales_order' : 'purchase_order',
                reference_id: headerToSave.id,
                amount: paidDelta,
                payment_method: 'CASH',
                voucher_date: now.split('T')[0],
                notes: isSales
                  ? `تحصيل دفعة إضافية على فاتورة مبيعات #${String(headerToSave.id).slice(0, 8).toUpperCase()}`
                  : `سداد دفعة إضافية على أمر شراء #${String(headerToSave.id).slice(0, 8).toUpperCase()}`,
                sync_status: 'PENDING',
                created_at: now,
                updated_at: now,
                deleted_at: null
              });
            } else if (paidDelta < 0) {
              await syncInvoiceVouchersOnPaidReduction(headerToSave.id, paid, now);
            }
          }
        }

        // Link Purchase Order directly to Expenses & Supplier Balances (apply delta)
        if (headerTable === 'purchase_orders') {
          const paidAmount = Number(headerToSave.amount_paid) || 0;
          const supplier = headerToSave.supplier_id ? await db.suppliers.get(headerToSave.supplier_id) : null;
          const supplierName = supplier?.supplier_name || '';

          const deterministicId = `exp-po-${headerToSave.id}`;
          const existingExpenses = await db.expenses
            .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[PO:${headerToSave.id}]`)))
            .toArray();
          const existingExp = existingExpenses[0];

          if (existingExp && existingExp.deleted_at) {
            // Respect soft-deleted expense: do nothing
          } else if (paidAmount > 0) {
            const expenseData = {
              id: existingExp ? existingExp.id : deterministicId,
              category: 'MATERIALS',
              amount: paidAmount,
              expense_date: headerToSave.order_date || now.split('T')[0],
              notes: `[PO:${headerToSave.id}] ${supplierName ? supplierName + ' - ' : ''}Raw Materials Purchase`,
              recorded_by: headerToSave.recorded_by || null,
              created_at: existingExp?.created_at || now,
              updated_at: now,
              deleted_at: null,
              sync_status: 'PENDING'
            };
            await db.expenses.put(expenseData);
          } else if (existingExp) {
            await db.expenses.update(existingExp.id, {
              deleted_at: now,
              sync_status: 'PENDING'
            });
          }

          // Update supplier balance using delta: balance = currentBalance + (newRemaining - oldRemaining)
          const oldSupplierId = hasActiveOldHeader ? oldHeader.supplier_id : null;
          const newSupplierId = headerToSave.supplier_id || null;
          if (oldSupplierId && oldSupplierId !== newSupplierId) {
            const oldSupplier = await db.suppliers.get(oldSupplierId);
            if (oldSupplier) {
              await db.suppliers.update(oldSupplierId, {
                account_balance: (Number(oldSupplier.account_balance) || 0) - oldRemaining,
                updated_at: now,
                sync_status: 'PENDING'
              });
            }
            if (newSupplierId && supplier) {
              await db.suppliers.update(newSupplierId, {
                account_balance: (Number(supplier.account_balance) || 0) + newRemaining,
                updated_at: now,
                sync_status: 'PENDING'
              });
            }
          } else if (newSupplierId && supplier) {
            const currentBalance = Number(supplier.account_balance) || 0;
            await db.suppliers.update(newSupplierId, {
              account_balance: currentBalance + (newRemaining - oldRemaining),
              updated_at: now,
              sync_status: 'PENDING'
            });
          }
        }

        // Link Sales Order to Customer Balances (apply delta)
        if (headerTable === 'sales_orders') {
          const oldCustomerId = hasActiveOldHeader ? oldHeader.customer_id : null;
          const newCustomerId = headerToSave.customer_id || null;
          if (oldCustomerId && oldCustomerId !== newCustomerId) {
            const oldCustomer = await db.customers.get(oldCustomerId);
            if (oldCustomer) {
              await db.customers.update(oldCustomerId, {
                account_balance: (Number(oldCustomer.account_balance) || 0) - oldRemaining,
                updated_at: now,
                sync_status: 'PENDING'
              });
            }
            if (newCustomerId) {
              const newCustomer = await db.customers.get(newCustomerId);
              if (newCustomer) {
                await db.customers.update(newCustomerId, {
                  account_balance: (Number(newCustomer.account_balance) || 0) + newRemaining,
                  updated_at: now,
                  sync_status: 'PENDING'
                });
              }
            }
          } else if (newCustomerId) {
            const customer = await db.customers.get(newCustomerId);
            if (customer) {
              const currentBalance = Number(customer.account_balance) || 0;
              await db.customers.update(newCustomerId, {
                account_balance: currentBalance + (newRemaining - oldRemaining),
                updated_at: now,
                sync_status: 'PENDING'
              });
            }
          }
        }
      });

      setView('list');
      await loadData();
      await loadRelations();
    } catch (err) {
      console.error('Save transaction failed:', err);
      dialog.alert({
        variant: 'error',
        message: err?.message || (isRTL ? 'فشل حفظ الفاتورة' : 'Failed to save transaction')
      });
    }
  };

  const handleDiscountPercentChange = (percentVal) => {
    const p = Math.max(0, Math.min(100, Number(percentVal) || 0));
    const subtotal = currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    const amt = (subtotal * p) / 100;
    const finalTotal = Math.max(0, subtotal - amt);
    const paid = Number(currentHeader.amount_paid) || 0;
    const rem = finalTotal - paid;
    let autoStatus = currentHeader.payment_status;
    if (finalTotal > 0) {
      autoStatus = paid >= finalTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
    }
    setCurrentHeader(prev => ({
      ...prev,
      discount_percent: percentVal,
      discount_amount: Math.round(amt * 100) / 100,
      total_amount: finalTotal,
      remaining_amount: rem,
      payment_status: autoStatus
    }));
  };

  const handleDiscountAmountChange = (amountVal) => {
    const a = Math.max(0, Number(amountVal) || 0);
    const subtotal = currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    const pct = subtotal > 0 ? ((a / subtotal) * 100) : 0;
    const finalTotal = Math.max(0, subtotal - a);
    const paid = Number(currentHeader.amount_paid) || 0;
    const rem = finalTotal - paid;
    let autoStatus = currentHeader.payment_status;
    if (finalTotal > 0) {
      autoStatus = paid >= finalTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
    }
    setCurrentHeader(prev => ({
      ...prev,
      discount_amount: amountVal,
      discount_percent: Math.round(pct * 100) / 100,
      total_amount: finalTotal,
      remaining_amount: rem,
      payment_status: autoStatus
    }));
  };

  const handleAmountPaidChange = (paidVal) => {
    const paid = Number(paidVal) || 0;
    const subtotal = currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    const discAmt = Number(currentHeader.discount_amount) || 0;
    const finalTotal = Math.max(0, subtotal - discAmt);
    const rem = finalTotal - paid;
    let autoStatus = currentHeader.payment_status;
    if (finalTotal > 0) {
      autoStatus = paid >= finalTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
    }
    setCurrentHeader(prev => ({
      ...prev,
      amount_paid: paidVal,
      remaining_amount: rem,
      payment_status: autoStatus
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...currentItems];
    newItems[index][field] = value;
    
    // Auto-calculate total
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unit_price) || 0);
    }
    
    // Auto-populate price and material_id if product selected from stock!
    if (field === 'material_id' || field === 'product_name') {
      const product = field === 'material_id'
        ? inventory.find(i => i.id === value)
        : inventory.find(i => i.material_name === value);
      if (product) {
        newItems[index].material_id = product.id;
        newItems[index].raw_material_id = product.id;
        newItems[index].product_name = product.material_name;
        const autoPrice = (headerTable === 'purchase_orders')
          ? (product.unit_price ?? product.cost_price ?? product.price_per_unit ?? 0)
          : (product.sales_unit_price ?? product.unit_price ?? product.price_per_unit ?? 0);
        newItems[index].unit_price = Number(autoPrice) || 0;
        newItems[index].total_price = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unit_price) || 0);
      } else if (!value) {
        newItems[index].material_id = '';
        newItems[index].raw_material_id = '';
        newItems[index].product_name = '';
      }
    }
    
    const newSubtotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    let discAmt = Number(currentHeader.discount_amount) || 0;
    const discPct = Number(currentHeader.discount_percent) || 0;
    if (discPct > 0) {
      discAmt = (newSubtotal * discPct) / 100;
    } else if (discAmt > newSubtotal) {
      discAmt = newSubtotal;
    }
    const newTotal = Math.max(0, newSubtotal - discAmt);
    const paid = Number(currentHeader.amount_paid) || 0;
    const remaining = newTotal - paid;
    let autoStatus = currentHeader.payment_status;
    if (newTotal > 0) {
      autoStatus = paid >= newTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
    }

    setCurrentHeader(prev => ({ 
      ...prev, 
      subtotal: newSubtotal,
      discount_amount: Math.round(discAmt * 100) / 100,
      total_amount: newTotal,
      remaining_amount: remaining,
      payment_status: autoStatus 
    }));
    setCurrentItems(newItems);
  };

  const handleFileChange = async (index, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const base64Images = [];
    for (let file of files) {
      const reader = new FileReader();
      const promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
      });
      reader.readAsDataURL(file);
      base64Images.push(await promise);
    }
    
    const newItems = [...currentItems];
    newItems[index].image_data = JSON.stringify(base64Images);
    setCurrentItems(newItems);
  };

  const addItemRow = () => {
    setCurrentItems([...currentItems, { id: uuidv4(), material_id: '', raw_material_id: '', product_name: '', quantity: 1, unit_price: 0, total_price: 0, image_data: null }]);
  };

  const removeItemRow = (index) => {
    const newItems = [...currentItems];
    newItems.splice(index, 1);
    setCurrentItems(newItems);
  };

  const computedCards = customCards !== undefined
    ? (typeof customCards === 'function' ? customCards(headers, relations, t, isRTL) : customCards)
    : computeTableMetrics(headerTable, headers, relations, t, isRTL);

  // --- LIST VIEW WITH MODAL OVERLAY ---
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>{title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text)' }} onClick={() => window.print()}>
            <Printer size={18} /> {t('print') || 'Print List'}
          </button>
          <button className="btn btn-primary" onClick={handleAddNew}>
            <Plus size={18} /> {t('add_new') || 'Add New'}
          </button>
        </div>
      </div>

      {/* shadcn UI Metric Cards */}
      <PageMetricCards cards={computedCards} />

      <div className={`glass-card ${viewDetailRecord || profileTarget || view === 'form' ? 'hide-on-print' : 'print-area'}`}>
        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div 
            className="hide-on-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              marginBottom: '1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>
                {isRTL 
                  ? `تم تحديد ${selectedIds.length} من أصل ${headers.length} سجل` 
                  : `${selectedIds.length} of ${headers.length} records selected`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                {isRTL ? 'إلغاء التحديد' : 'Deselect all'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
              }}
            >
              <Trash2 size={16} />
              <span>
                {isRTL 
                  ? `حذف السجلات المحددة (${selectedIds.length})` 
                  : `Delete Selected (${selectedIds.length})`}
              </span>
            </button>
          </div>
        )}

        <div className="print-header">
          <div>
            <h2 className="company-name">{getDisplayName(isRTL)}</h2>
            <div style={{ fontSize: '11pt', color: '#71717a', fontWeight: 600, marginBottom: '4px' }}>( {t('packaging_solutions_system')} )</div>
            <p className="report-title">{title} - {t('report')}</p>
          </div>
          <div className="print-meta">
            {t('printed_at')} {new Date().toLocaleString()}<br/>
            {t('system_name')}
          </div>
        </div>
        {/* Modern Live Search & Table Toolbar */}
        <div className="hide-on-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem', 
          flexWrap: 'wrap', 
          gap: '0.75rem' 
        }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '420px' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              [isRTL ? 'right' : 'left']: '0.85rem', 
              color: 'var(--text-muted)' 
            }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isRTL ? `بحث فوري في ${title}...` : `Quick search in ${title}...`}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                [isRTL ? 'paddingRight' : 'paddingLeft']: '2.3rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.88rem'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isRTL ? 'left' : 'right']: '0.65rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <span className="badge-pill" style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {isRTL 
                ? `${filteredHeaders.length} من أصل ${headers.length} سجل` 
                : `${filteredHeaders.length} of ${headers.length} records`}
            </span>
          </div>
        </div>

        <div className="table-card" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: isRTL ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th className="hide-on-print" style={{ width: '46px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={filteredHeaders.length > 0 && selectedIds.length === filteredHeaders.length}
                    ref={el => {
                      if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < filteredHeaders.length;
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredHeaders.map(r => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </th>
                {headerSchema.map(field => (
                  <th key={field.key} style={{ textAlign: isRTL ? 'right' : 'left' }}>{t(field.label)}</th>
                ))}
                <th className="hide-on-print" style={{ textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHeaders.map(record => {
                const totalAmt = Number(record.total_amount) || 0;
                const paidAmt = Number(record.amount_paid) || 0;
                const remAmt = record.remaining_amount !== undefined && record.remaining_amount !== null
                  ? Number(record.remaining_amount)
                  : (totalAmt - paidAmt);

                return (
                  <tr 
                    key={record.id}
                    className="clickable-row"
                    onClick={() => handleViewRecord(record)}
                    style={{
                      backgroundColor: selectedIds.includes(record.id) ? 'rgba(239, 68, 68, 0.07)' : undefined,
                    }}
                  >
                    <td className="hide-on-print" style={{ width: '46px', textAlign: 'center', padding: '0.75rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, record.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== record.id));
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    {headerSchema.map(field => {
                      if (field.key === 'remaining_amount') {
                        return (
                          <td key={field.key} style={{ padding: '1rem', fontWeight: 600, color: remAmt < 0 ? '#2563eb' : (remAmt > 0 ? '#EF4444' : '#10B981') }}>
                            <span>{formatAmount(remAmt)} {t('egp')}</span>
                            {remAmt < 0 && (
                              <span style={{ marginInlineStart: '0.4rem', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', fontWeight: 700 }}>
                                دفعة مقدمة
                              </span>
                            )}
                          </td>
                        );
                      }
                      if (field.key === 'total_amount') {
                        return (
                          <td key={field.key} style={{ padding: '1rem', fontWeight: 700 }}>
                            {formatAmount(totalAmt)} {t('egp')}
                          </td>
                        );
                      }
                      if (field.key === 'discount_amount') {
                        const discVal = Number(record.discount_amount) || 0;
                        const discPct = Number(record.discount_percent) || 0;
                        return (
                          <td key={field.key} style={{ padding: '1rem', color: discVal > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                            {discVal > 0 ? (
                              <span>
                                -{formatAmount(discVal)} {t('egp')} {discPct > 0 ? `(${discPct}%)` : ''}
                              </span>
                            ) : '—'}
                          </td>
                        );
                      }
                      if (field.key === 'amount_paid') {
                        return (
                          <td key={field.key} style={{ padding: '1rem', fontWeight: 600, color: '#10B981' }}>
                            {formatAmount(paidAmt)} {t('egp')}
                          </td>
                        );
                      }
                      return (
                        <td key={field.key} style={{ padding: '1rem' }}>
                          {field.type === 'relation' ? (
                            TABLE_TO_ENTITY_TYPE?.[field?.relationTable] && record[field.key] ? (
                              <ProfileLink
                                label={getRelationLabel(field, record[field.key])}
                                title={isRTL ? 'عرض الملف الشامل' : 'View Full Profile'}
                                onOpen={() => setProfileTarget({ type: TABLE_TO_ENTITY_TYPE[field.relationTable], id: record[field.key] })}
                              />
                            ) : getRelationLabel(field, record[field.key])
                          )
                          : field.key === 'payment_status' ? (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: record[field.key] === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : record[field.key] === 'PARTIAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: record[field.key] === 'PAID' ? '#10B981' : record[field.key] === 'PARTIAL' ? '#F59E0B' : '#EF4444'
                            }}>
                              {t(String(record[field.key]).toLowerCase()) || record[field.key]}
                            </span>
                          )
                          : field.options ? (t(String(record[field.key]).toLowerCase()) || record[field.key])
                          : field.isCurrency ? `${formatAmount(record[field.key])} ${t('egp')}`
                          : record[field.key]}
                        </td>
                      );
                    })}
                    <td className="hide-on-print" style={{ padding: '1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {customActions.map((action, idx) => (
                          <button
                            key={idx}
                            className="icon-btn"
                            disabled={action.disabled}
                            style={{
                              color: action.color || 'var(--primary)',
                              opacity: action.disabled ? 0.5 : 1,
                              cursor: action.disabled ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => !action.disabled && action.onClick(record)}
                            title={action.label}
                          >
                            {action.icon}
                          </button>
                        ))}
                        <button className="icon-btn" onClick={() => handleEdit(record)} title={t('edit') || 'Edit'}>
                          <Edit3 size={16} />
                        </button>
                        <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(record.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredHeaders.length === 0 && (
                <tr>
                  <td colSpan={headerSchema.length + 2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchQuery ? (isRTL ? 'لا توجد نتائج مطابقة للبحث' : 'No matching records found') : t('no_records')}
                  </td>
                </tr>
              )}
            </tbody>
            {filteredHeaders.length > 0 && headerSchema.some(f => f.isCurrency || f.showTotal) && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700, backgroundColor: 'var(--surface-hover)' }}>
                  <td className="hide-on-print"></td>
                  {headerSchema.map((field, i) => {
                    let totalVal = null;
                    if (field.key === 'remaining_amount') {
                      totalVal = filteredHeaders.reduce((sum, r) => {
                        const rem = r.remaining_amount !== undefined && r.remaining_amount !== null
                          ? Number(r.remaining_amount)
                          : ((Number(r.total_amount) || 0) - (Number(r.amount_paid) || 0));
                        return sum + rem;
                      }, 0);
                    } else if (field.isCurrency || field.showTotal) {
                      totalVal = filteredHeaders.reduce((sum, r) => sum + (Number(r[field.key]) || 0), 0);
                    }

                    return (
                      <td key={field.key} style={{ 
                        padding: '1rem', 
                        color: field.key === 'remaining_amount' ? (totalVal < 0 ? '#2563eb' : '#EF4444') : 'var(--text-main)', 
                        fontWeight: 800,
                        textAlign: i === 0 ? (isRTL ? 'left' : 'right') : (isRTL ? 'right' : 'left') 
                      }}>
                        {i === 0 && (
                          <span style={{ fontWeight: 800, color: 'var(--text-main)', marginInlineEnd: '0.4rem' }}>
                            {(t('grand_total') || (isRTL ? 'الإجمالي الكلي' : 'Grand Total')) + ':'}
                          </span>
                        )}
                        {totalVal !== null && (
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: field.key === 'remaining_amount' ? (totalVal < 0 ? '#2563eb' : '#EF4444') : 'var(--text-main)' }}>
                            {field.isCurrency 
                              ? `${formatAmount(totalVal)} ${t('egp') || (isRTL ? 'ج.م' : 'EGP')}${field.key === 'remaining_amount' && totalVal < 0 ? ' (دفعة مقدمة)' : ''}`
                              : totalVal}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="hide-on-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Transaction Add/Edit Modal Overlay */}
      {view === 'form' && currentHeader && (
        <div 
          className="modern-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setView('list');
              loadData();
            }
          }}
        >
          <div 
            className="glass-card modern-modal-dialog" 
            style={{ 
              width: 'min(94vw, 940px)', 
              maxWidth: 'min(94vw, 940px)', 
              maxHeight: '86vh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              padding: 0
            }}
          >
            {/* Modern Executive Modal Header */}
            <div className="modern-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ 
                  width: 46, 
                  height: 46, 
                  borderRadius: '14px', 
                  background: 'rgba(37, 99, 235, 0.12)', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0 
                }}>
                  <FileText size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                      {currentHeader.created_at ? (t('edit') || 'Edit') : (t('add_new') || 'New')} {title}
                    </h2>
                    {currentHeader.id && (
                      <span className="badge-pill badge-pill-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        #{String(currentHeader.id).slice(0, 8).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {currentHeader.created_at
                      ? (isRTL ? 'تعديل بنود وتفاصيل المعاملة المالية والتشغيلية' : 'Edit transaction attributes and line items')
                      : (isRTL ? 'إنشاء معاملة جديدة وإضافة البنود وحساب الإجمالي' : 'Create new transaction and populate line items')}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                className="modern-modal-close-btn" 
                onClick={() => { setView('list'); loadData(); }}
                title={isRTL ? 'إغلاق' : 'Close'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Independently Scrollable */}
            <div 
              className="modal-body-scroll"
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '1.75rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem' 
              }}
            >
              {/* Header Details Card */}
              <div className="modern-card-section">
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {t('header_details') || 'Header Details'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {headerSchema.map(field => {
                    const itemsSubtotal = currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
                    const discAmt = Number(currentHeader.discount_amount) || 0;
                    const finalTotal = Math.max(0, itemsSubtotal - discAmt);
                    const paidAmount = Number(currentHeader.amount_paid) || 0;
                    const remainingValue = finalTotal - paidAmount;

                    if (field.key === 'subtotal') {
                      return (
                        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {t(field.label)}
                          </label>
                          <div style={{ padding: '0.72rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700 }}>
                            {formatAmount(itemsSubtotal)} {t('egp')}
                          </div>
                        </div>
                      );
                    }

                    if (field.key === 'total_amount') {
                      return (
                        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {t(field.label)} ({t('auto_calculated') || 'Calculated'})
                          </label>
                          <div style={{ padding: '0.72rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 800 }}>
                            {formatAmount(finalTotal)} {t('egp')}
                          </div>
                        </div>
                      );
                    }

                    if (field.key === 'remaining_amount') {
                      return (
                        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {t(field.label)}
                          </label>
                          <div style={{ 
                            padding: '0.72rem 1rem', 
                            borderRadius: '10px', 
                            border: '1.5px solid var(--border)', 
                            background: remainingValue < 0 ? 'rgba(37, 99, 235, 0.08)' : (remainingValue > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'), 
                            color: remainingValue < 0 ? '#2563eb' : (remainingValue > 0 ? '#EF4444' : '#10B981'), 
                            fontSize: '0.95rem', 
                            fontWeight: 700,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>{formatAmount(remainingValue)} {t('egp')}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {remainingValue < 0 ? 'دفعة مقدمة' : (remainingValue === 0 && finalTotal > 0 ? (t('paid') || 'Paid') : (remainingValue > 0 ? (t('unpaid') || 'Due') : ''))}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (field.key === 'discount_amount') {
                      return (
                        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {t(field.label)}
                          </label>
                          <input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentHeader.discount_amount ?? ''} 
                            onChange={e => handleDiscountAmountChange(e.target.value)}
                            placeholder="0.00"
                            className="modern-input"
                            style={{ width: '100%', color: '#ef4444', fontWeight: 700 }}
                          />
                        </div>
                      );
                    }

                    if (field.key === 'discount_percent') {
                      return (
                        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {t(field.label)}
                          </label>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={currentHeader.discount_percent ?? ''} 
                            onChange={e => handleDiscountPercentChange(e.target.value)}
                            placeholder="0"
                            className="modern-input"
                            style={{ width: '100%', fontWeight: 700 }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {t(field.label)}
                        </label>
                        {field.type === 'relation' ? (
                          <select 
                            dir={isRTL ? 'rtl' : 'ltr'}
                            value={currentHeader[field.key] || ''} 
                            onChange={e => setCurrentHeader({...currentHeader, [field.key]: e.target.value})}
                            className="modern-input"
                            style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                          >
                            <option value="">-- {t('select')} {t(field.label)} --</option>
                            {relations[field.key]?.map(rel => (
                              <option key={rel.id} value={rel.id}>
                                {field.relationLabel === 'id' ? `${t(field.label)} #${String(rel.id).slice(0, 8).toUpperCase()}` : rel[field.relationLabel]}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'select' ? (
                          <select 
                            dir={isRTL ? 'rtl' : 'ltr'}
                            value={currentHeader[field.key] || ''} 
                            onChange={e => setCurrentHeader({...currentHeader, [field.key]: e.target.value})}
                            className="modern-input"
                            style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                          >
                            <option value="">-- {t('select')} {t(field.label)} --</option>
                            {field.options.map(opt => <option key={opt} value={opt}>{t(opt.toLowerCase()) || opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={currentHeader[field.key] ?? ''} 
                            onChange={e => {
                              const val = e.target.value;
                              if (field.key === 'amount_paid') {
                                handleAmountPaidChange(val);
                              } else {
                                setCurrentHeader({...currentHeader, [field.key]: val});
                              }
                            }}
                            className="modern-input"
                            style={{ width: '100%' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Line Items Card */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                    {t('line_items') || 'Line Items'}
                  </h3>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={addItemRow} 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem', backgroundColor: 'var(--surface-hover)' }}
                  >
                    <PlusCircle size={16} /> {t('add_item') || 'Add Item'}
                  </button>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem', textAlign: isRTL ? 'right' : 'left', fontWeight: 600 }}>{t('product_name') || 'Product / Material'}</th>
                        <th style={{ padding: '0.75rem', width: '110px', textAlign: isRTL ? 'right' : 'left', fontWeight: 600 }}>{t('quantity') || 'Quantity'}</th>
                        <th style={{ padding: '0.75rem', width: '130px', textAlign: isRTL ? 'right' : 'left', fontWeight: 600 }}>{t('unit_price') || 'Unit Price'}</th>
                        <th style={{ padding: '0.75rem', width: '130px', textAlign: isRTL ? 'right' : 'left', fontWeight: 600 }}>{t('total_price') || 'Total Price'}</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{t('image') || 'Images'}</th>
                        <th style={{ padding: '0.75rem', width: '60px', textAlign: 'center', fontWeight: 600 }}>{t('actions') || 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <select 
                              dir={isRTL ? 'rtl' : 'ltr'}
                              value={item.material_id || item.raw_material_id || inventory.find(i => i.material_name === item.product_name)?.id || ''} 
                              onChange={(e) => handleItemChange(idx, 'material_id', e.target.value)}
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                            >
                              <option value="">-- {t('select_item_stock')} --</option>
                              {inventory.map(inv => {
                                const priceVal = headerTable === 'purchase_orders'
                                  ? (inv.unit_price ?? inv.price_per_unit ?? 0)
                                  : (inv.sales_unit_price ?? inv.unit_price ?? inv.price_per_unit ?? 0);
                                return (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.material_name} ({isRTL ? 'السعر' : 'Price'}: {formatAmount(priceVal)} {t('egp')} | {t('stock')}: {inv.stock_quantity})
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <input type="number" value={item.quantity || 0} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }} />
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <input type="number" step="0.01" value={item.unit_price || 0} onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }} />
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                            {formatAmount(item.total_price)} {t('egp')}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', backgroundColor: 'var(--surface-hover)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                <ImageIcon size={14} /> {t('upload')}
                                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(idx, e)} />
                              </label>
                              {item.image_data && (() => {
                                try {
                                  const imgs = JSON.parse(item.image_data);
                                  const imgArr = Array.isArray(imgs) ? imgs : [imgs];
                                  return (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      {imgArr.map((src, imgIdx) => (
                                        <img
                                          key={imgIdx}
                                          src={src}
                                          alt="Item"
                                          onClick={() => setPreviewImage(src)}
                                          title={t('click_to_view') || 'Click to view original size'}
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            objectFit: 'cover',
                                            borderRadius: '4px',
                                            cursor: 'zoom-in',
                                            border: '1.5px solid var(--border)',
                                            transition: 'transform 0.1s ease'
                                          }}
                                        />
                                      ))}
                                    </div>
                                  );
                                } catch {
                                  return <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 500 }}>{t('uploaded')}</span>;
                                }
                              })()}
                            </div>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <button type="button" className="icon-btn" onClick={() => removeItemRow(idx)} style={{ color: 'var(--danger)' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {currentItems.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            {t('no_items_added')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {currentItems.length > 0 && (() => {
                      const itemsSubtotal = currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
                      const discVal = Number(currentHeader.discount_amount) || 0;
                      const discPct = Number(currentHeader.discount_percent) || 0;
                      const finalTotal = Math.max(0, itemsSubtotal - discVal);
                      const paidAmount = Number(currentHeader.amount_paid) || 0;
                      const remVal = finalTotal - paidAmount;
                      return (
                        <tfoot>
                          <tr style={{ backgroundColor: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                            <td colSpan="2" style={{ padding: '0.75rem', textAlign: isRTL ? 'left' : 'right' }}>{t('subtotal') || 'Subtotal'}:</td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-main)', fontWeight: 700 }}>
                              {formatAmount(itemsSubtotal)} {t('egp')}
                            </td>
                            <td colSpan="3" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              {discVal > 0 && (
                                <span style={{ color: '#ef4444', marginInlineEnd: '0.75rem' }}>
                                  {t('discount')}: -{formatAmount(discVal)} {t('egp')} {discPct > 0 ? `(${discPct}%)` : ''} |
                                </span>
                              )}
                              <span style={{ color: 'var(--primary)', fontWeight: 800, marginInlineEnd: '0.5rem' }}>
                                {t('grand_total')}: {formatAmount(finalTotal)} {t('egp')}
                              </span>
                              |
                              <span style={{ color: 'var(--text-muted)', marginInlineStart: '0.5rem' }}>
                                {t('remaining_amount')}: <strong style={{ color: remVal < 0 ? '#2563eb' : (remVal > 0 ? '#EF4444' : '#10B981') }}>{formatAmount(remVal)} {t('egp')}{remVal < 0 ? ' (دفعة مقدمة)' : ''}</strong>
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>

                {/* Financial Summary & Manual Discount Control */}
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.25rem',
                  alignItems: 'center'
                }}>
                  {/* Subtotal */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                      {t('subtotal') || (isRTL ? 'المجموع الفرعي' : 'Subtotal')}
                    </label>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {formatAmount(currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0))} <span style={{ fontSize: '0.85rem' }}>{t('egp')}</span>
                    </div>
                  </div>

                  {/* Manual Discount Percentage */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                      {t('discount_percent') || (isRTL ? 'نسبة الخصم (%)' : 'Discount (%)')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0"
                        value={currentHeader.discount_percent ?? ''}
                        onChange={(e) => handleDiscountPercentChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text-main)',
                          fontWeight: 700
                        }}
                      />
                      <span style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
                    </div>
                  </div>

                  {/* Manual Discount Amount */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                      {t('discount_amount') || (isRTL ? 'مبلغ الخصم' : 'Discount Amount')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={currentHeader.discount_amount ?? ''}
                        onChange={(e) => handleDiscountAmountChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: '#ef4444',
                          fontWeight: 700
                        }}
                      />
                      <span style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('egp')}</span>
                    </div>
                  </div>

                  {/* Net Grand Total After Discount */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    border: '1px solid rgba(37, 99, 235, 0.25)'
                  }}>
                    <label style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>
                      {t('after_discount') || (isRTL ? 'الإجمالي بعد الخصم' : 'Total After Discount')}
                    </label>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb' }}>
                      {formatAmount(Math.max(0, currentItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0) - (Number(currentHeader.discount_amount) || 0)))} <span style={{ fontSize: '0.9rem' }}>{t('egp')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="modern-modal-footer">
              <button 
                type="button" 
                className="btn" 
                onClick={() => { setView('list'); loadData(); }}
                style={{ padding: '0.65rem 1.4rem', borderRadius: '10px' }}
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button 
                type="button" 
                className="modern-submit-btn" 
                onClick={handleSave} 
              >
                <Save size={18} /> <span>{t('save') || 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full size original image popup modal */}
      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
      {profileTarget && (
        <EntityProfileModal
          entityType={profileTarget.type}
          entityId={profileTarget.id}
          onClose={() => setProfileTarget(null)}
        />
      )}
      {viewDetailRecord && (
        <RecordDetailModal
          tableName={headerTable}
          title={title}
          schema={headerSchema}
          record={viewDetailRecord}
          relationsData={relations}
          items={viewDetailItems}
          itemsTitle={isRTL ? 'بنود المعاملة' : 'Transaction Line Items'}
          onClose={() => setViewDetailRecord(null)}
          onEdit={(rec) => {
            setViewDetailRecord(null);
            handleEdit(rec);
          }}
          onOpenProfile={setProfileTarget}
        />
      )}
    </div>
  );
}
