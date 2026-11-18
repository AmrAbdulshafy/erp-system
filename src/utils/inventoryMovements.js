import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';

/**
 * Records a stock movement in the dedicated `stock_movements` table
 */
export async function recordStockMovement({
  material_id,
  material_name,
  movement_type, // 'IN' | 'OUT' | 'ADJUSTMENT'
  source,        // 'purchase_order' | 'sales_order' | 'work_order_bom' | 'work_order_bom_revert' | 'sales_order_revert' | 'purchase_order_revert' | 'manual_adjustment'
  reference_type, // 'purchase_order' | 'sales_order' | 'work_order' | 'manual'
  reference_id,
  quantity,
  direction,     // 1 or -1
  stock_before,
  stock_after,
  unit_cost = 0,
  movement_date,
  notes = ''
}) {
  if (!db.stock_movements || !material_id) return null;
  const now = new Date().toISOString();
  const record = {
    id: uuidv4(),
    material_id,
    material_name: material_name || '',
    movement_type: movement_type || (direction >= 0 ? 'IN' : 'OUT'),
    source: source || 'manual_adjustment',
    reference_type: reference_type || 'manual',
    reference_id: reference_id || null,
    quantity: Math.abs(Number(quantity) || 0),
    direction: direction >= 0 ? 1 : -1,
    stock_before: Number(stock_before) || 0,
    stock_after: Number(stock_after) || 0,
    unit_cost: Number(unit_cost) || 0,
    movement_date: movement_date || now.split('T')[0],
    notes: notes || '',
    sync_status: 'PENDING',
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
  await db.stock_movements.put(record);
  return record;
}

/**
 * Unified helper to determine the material consumption rate per unit for Sales Orders, BOM, and COGS.
 */
export function getEffectiveMaterialRate(material, itemRate = null) {
  const explicitItemRate = Number(itemRate);
  if (Number.isFinite(explicitItemRate) && explicitItemRate > 0) {
    return explicitItemRate;
  }
  const matRate = Number(material?.consumption_per_unit);
  if (Number.isFinite(matRate) && matRate > 0) {
    return matRate;
  }
  return 1;
}

/**
 * Checks how much of each material_id was ALREADY deducted by a Sales Order
 * (or by a completed Work Order linked to that Sales Order) to prevent double deduction.
 */
export async function getAlreadyDeductedBySalesOrder(salesOrderId) {
  const deductedByMat = new Map();
  if (!salesOrderId) return deductedByMat;

  // 1. Check stock_movements table for this sales_order
  if (db.stock_movements) {
    const movs = await db.stock_movements
      .where('reference_id')
      .equals(salesOrderId)
      .filter(m => !m.deleted_at && m.reference_type === 'sales_order')
      .toArray();

    if (movs.length > 0) {
      for (const m of movs) {
        if (!m.material_id) continue;
        // Net deducted = OUT (+qty) minus IN (-qty)
        const netDeducted = (Number(m.quantity) || 0) * (m.direction < 0 ? 1 : -1);
        deductedByMat.set(m.material_id, (deductedByMat.get(m.material_id) || 0) + netDeducted);
      }
      return deductedByMat;
    }
  }

  // 2. Fallback for legacy Sales Orders created before stock_movements table existed:
  // If the Sales Order exists and is active, its sales_items were already deducted by TransactionCRUD
  const so = await db.sales_orders?.get(salesOrderId);
  if (so && !so.deleted_at && so.stock_deducted !== false) {
    const items = await db.sales_items
      .where('sales_order_id')
      .equals(salesOrderId)
      .filter(i => !i.deleted_at)
      .toArray();
    for (const item of items) {
      const matId = item.material_id || item.raw_material_id;
      if (matId) {
        const mat = await db.raw_materials?.get(matId);
        const rate = getEffectiveMaterialRate(mat, item.consumption_per_unit);
        deductedByMat.set(matId, (deductedByMat.get(matId) || 0) + ((Number(item.quantity) || 0) * rate));
      }
    }
  }

  return deductedByMat;
}

/**
 * Checks how much of each material_id was ALREADY deducted by completed Work Orders
 * linked to a given Sales Order, so saving/editing the Sales Order does not deduct again.
 */
export async function getAlreadyDeductedByWorkOrderForSalesOrder(salesOrderId) {
  const deductedByMat = new Map();
  if (!salesOrderId || !db.work_orders) return deductedByMat;

  const linkedWOs = await db.work_orders
    .where('sales_order_id')
    .equals(salesOrderId)
    .filter(wo => !wo.deleted_at && (wo.bom_deducted === 1 || wo.bom_deducted === true))
    .toArray();

  for (const wo of linkedWOs) {
    // Only count movements actually deducted by the Work Order itself (not skipped because of invoice)
    const movs = Array.isArray(wo.bom_movements) ? wo.bom_movements : [];
    for (const m of movs) {
      if (m.material_id && Number(m.deducted_quantity) > 0 && !m.already_deducted_by_invoice) {
        deductedByMat.set(
          m.material_id,
          (deductedByMat.get(m.material_id) || 0) + (Number(m.deducted_quantity) || 0)
        );
      }
    }
  }

  return deductedByMat;
}

/**
 * Generates the next sequential voucher number (e.g. RV-0005 or PV-0005)
 * Uses max numeric suffix across all existing vouchers (including soft-deleted)
 * to guarantee strictly unique, monotonic voucher numbers without collisions after deletions.
 */
export async function generateNextVoucherNumber(voucherType = 'RECEIPT') {
  const prefix = voucherType === 'RECEIPT' ? 'RV' : 'PV';
  if (!db.payment_vouchers) return `${prefix}-${Date.now().toString().slice(-4)}`;

  const rows = await db.payment_vouchers
    .where('voucher_type')
    .equals(voucherType)
    .toArray();

  let maxSeq = rows.length;
  const existingNumbers = new Set();

  for (const r of rows) {
    const numStr = String(r.voucher_number || '').trim().toUpperCase();
    if (!numStr) continue;
    existingNumbers.add(numStr);
    const match = numStr.match(/^(?:RV|PV)-(\d+)$/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
  while (existingNumbers.has(candidate)) {
    nextSeq += 1;
    candidate = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
}

/**
 * Creates an official Receipt Voucher (سند قبض) or Payment Voucher (سند صرف)
 * and atomically updates the linked invoice (if any) and Customer/Supplier account_balance.
 */
export async function createOfficialVoucher({
  voucher_type,   // 'RECEIPT' (from customer) | 'PAYMENT' (to supplier)
  entity_type,    // 'customer' | 'supplier'
  entity_id,
  entity_name = '',
  reference_type = 'account', // 'sales_order' | 'purchase_order' | 'account'
  reference_id = null,
  amount,
  payment_method = 'CASH',
  voucher_date,
  notes = '',
  recorded_by = null
}) {
  const numericAmount = Number(amount) || 0;
  if (numericAmount <= 0) {
    throw new Error('قيمة السند يجب أن تكون أكبر من صفر');
  }

  const now = new Date().toISOString();
  const voucherNumber = await generateNextVoucherNumber(voucher_type);
  const voucherId = uuidv4();

  const tables = [
    db.payment_vouchers,
    db.sales_orders,
    db.purchase_orders,
    db.customers,
    db.suppliers,
    db.expenses
  ].filter(Boolean);

  let createdVoucher = null;

  await db.transaction('rw', tables, async () => {
    // Resolve entity name if not provided
    let resolvedEntityName = entity_name;
    if (!resolvedEntityName && entity_id) {
      if (entity_type === 'customer') {
        const c = await db.customers.get(entity_id);
        resolvedEntityName = c?.customer_name || '';
      } else if (entity_type === 'supplier') {
        const s = await db.suppliers.get(entity_id);
        resolvedEntityName = s?.supplier_name || '';
      }
    }

    createdVoucher = {
      id: voucherId,
      voucher_number: voucherNumber,
      voucher_type,
      entity_type,
      entity_id: entity_id || null,
      entity_name: resolvedEntityName,
      reference_type: reference_id ? reference_type : 'account',
      reference_id: reference_id || null,
      amount: numericAmount,
      payment_method: payment_method || 'CASH',
      voucher_date: voucher_date || now.split('T')[0],
      notes: notes || (voucher_type === 'RECEIPT' ? 'سند قبض تحصيل نقدية' : 'سند صرف سداد مستحقات'),
      recorded_by: recorded_by || null,
      sync_status: 'PENDING',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await db.payment_vouchers.put(createdVoucher);

    // 1. If linked to a Sales Order, update invoice amount_paid, remaining_amount, payment_status
    if (reference_type === 'sales_order' && reference_id) {
      const so = await db.sales_orders.get(reference_id);
      if (so && !so.deleted_at) {
        const total = Number(so.total_amount) || 0;
        const newPaid = (Number(so.amount_paid) || 0) + numericAmount;
        const newRem = total - newPaid;
        const newStatus = newPaid >= total ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');
        await db.sales_orders.update(reference_id, {
          amount_paid: newPaid,
          remaining_amount: newRem,
          payment_status: newStatus,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    }

    // 2. If linked to a Purchase Order, update PO amount_paid, remaining_amount, payment_status & linked expense
    if (reference_type === 'purchase_order' && reference_id) {
      const po = await db.purchase_orders.get(reference_id);
      if (po && !po.deleted_at) {
        const total = Number(po.total_amount) || 0;
        const newPaid = (Number(po.amount_paid) || 0) + numericAmount;
        const newRem = total - newPaid;
        const newStatus = newPaid >= total ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');
        await db.purchase_orders.update(reference_id, {
          amount_paid: newPaid,
          remaining_amount: newRem,
          payment_status: newStatus,
          updated_at: now,
          sync_status: 'PENDING'
        });

        // Update linked PO expense
        const deterministicId = `exp-po-${po.id}`;
        const existingExp = await db.expenses.get(deterministicId);
        if (!existingExp || !existingExp.deleted_at) {
          await db.expenses.put({
            id: existingExp ? existingExp.id : deterministicId,
            category: 'MATERIALS',
            amount: newPaid,
            expense_date: po.order_date || now.split('T')[0],
            notes: `[PO:${po.id}] ${resolvedEntityName ? resolvedEntityName + ' - ' : ''}Raw Materials Purchase`,
            purchase_order_id: po.id,
            linked_type: 'purchase_order',
            linked_id: po.id,
            created_at: existingExp?.created_at || now,
            updated_at: now,
            deleted_at: null,
            sync_status: 'PENDING'
          });
        }
      }
    }

    // 3. Update Customer or Supplier account_balance (reduce balance owed)
    if (entity_type === 'customer' && entity_id) {
      const cust = await db.customers.get(entity_id);
      if (cust) {
        const curBal = Number(cust.account_balance) || 0;
        await db.customers.update(entity_id, {
          account_balance: curBal - numericAmount,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    } else if (entity_type === 'supplier' && entity_id) {
      const supp = await db.suppliers.get(entity_id);
      if (supp) {
        const curBal = Number(supp.account_balance) || 0;
        await db.suppliers.update(entity_id, {
          account_balance: curBal - numericAmount,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    }
  });

  return createdVoucher;
}

/**
 * Calculates true Cost of Goods Sold (COGS / تكلفة البضاعة المباعة الفعلية)
 * based on sold items (sales_items) and completed work order BOM deductions,
 * rather than subtracting total raw material purchases sitting in inventory.
 */
export function calculateCOGS({
  salesOrders = [],
  salesItems = [],
  rawMaterials = [],
  purchaseItems = [],
  workOrders = []
}) {
  const matById = new Map();
  const matByName = new Map();
  for (const m of rawMaterials || []) {
    if (m.id) matById.set(m.id, m);
    if (m.material_name) matByName.set(String(m.material_name).trim().toLowerCase(), m);
  }

  // Fallback average cost from purchase_items if a raw_material has unit_price === 0
  const poCostSum = new Map();
  const poQtySum = new Map();
  for (const pi of purchaseItems || []) {
    const key = pi.raw_material_id || pi.material_id || String(pi.product_name || '').trim().toLowerCase();
    if (!key) continue;
    const q = Number(pi.quantity) || 0;
    const tot = Number(pi.total_price) || (q * (Number(pi.unit_price) || 0));
    if (q > 0 && tot > 0) {
      poCostSum.set(key, (poCostSum.get(key) || 0) + tot);
      poQtySum.set(key, (poQtySum.get(key) || 0) + q);
    }
  }

  const getMaterialCostAndRate = (matId, prodName, itemRate) => {
    const cleanName = String(prodName || '').trim().toLowerCase();
    const mat = (matId && matById.get(matId)) || (cleanName && matByName.get(cleanName)) || null;
    let unitCost = Number(mat?.unit_price) || 0;
    if (unitCost <= 0) {
      const lookupKey = mat?.id || matId || cleanName;
      if (lookupKey && poQtySum.get(lookupKey) > 0) {
        unitCost = poCostSum.get(lookupKey) / poQtySum.get(lookupKey);
      }
    }
    const rate = Number(itemRate) > 0
      ? Number(itemRate)
      : (Number(mat?.consumption_per_unit) > 0 ? Number(mat.consumption_per_unit) : 1);
    return { unitCost, rate };
  };

  const activeSalesIds = new Set((salesOrders || []).map(so => so.id));
  let salesItemsCOGS = 0;

  for (const item of salesItems || []) {
    if (!activeSalesIds.has(item.sales_order_id)) continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;
    const matId = item.material_id || item.raw_material_id;
    const { unitCost, rate } = getMaterialCostAndRate(matId, item.product_name, item.consumption_per_unit);
    salesItemsCOGS += qty * rate * unitCost;
  }

  // Add BOM cost from completed Work Orders that were NOT already counted in salesItemsCOGS
  let extraBomCOGS = 0;
  for (const wo of workOrders || []) {
    if (wo.bom_deducted !== 1 && wo.bom_deducted !== true) continue;
    // If linked to an active sales order in this period, only count additional BOM deductions above what the invoice covered
    const isLinkedToFilteredSO = Boolean(wo.sales_order_id && activeSalesIds.has(wo.sales_order_id));
    const movs = Array.isArray(wo.bom_movements) ? wo.bom_movements : [];
    for (const m of movs) {
      const qtyToCost = isLinkedToFilteredSO
        ? (Number(m.deducted_quantity) || 0)
        : (Number(m.gross_required_quantity ?? m.deducted_quantity) || 0);
      if (qtyToCost <= 0) continue;
      const { unitCost } = getMaterialCostAndRate(m.material_id, m.material_name, 1);
      const costPerUnit = Number(m.unit_cost) > 0 ? Number(m.unit_cost) : unitCost;
      extraBomCOGS += qtyToCost * costPerUnit;
    }
  }

  const totalCOGS = Math.round((salesItemsCOGS + extraBomCOGS) * 100) / 100;
  return {
    totalCOGS,
    salesItemsCOGS: Math.round(salesItemsCOGS * 100) / 100,
    extraBomCOGS: Math.round(extraBomCOGS * 100) / 100
  };
}

/**
 * Calculates the exact net quantities per material_id to restore to warehouse stock
 * when a Sales Order is deleted:
 * 1. Starts from what was actually deducted by the Sales Order itself (not what a prior Work Order deducted).
 * 2. If a linked Work Order is still COMPLETED and relied on this Sales Order's deduction
 *    (`already_deducted_by_invoice > 0`), transfers that deduction ownership to the Work Order
 *    so stock is not over-restored while the Work Order remains COMPLETED.
 */
export async function prepareSalesOrderDeleteStockRestore(salesOrderId, now = new Date().toISOString()) {
  const netRestoreByMat = await getAlreadyDeductedBySalesOrder(salesOrderId);
  if (!salesOrderId || !db.work_orders) return netRestoreByMat;

  const linkedCompletedWOs = await db.work_orders
    .where('sales_order_id')
    .equals(salesOrderId)
    .filter(wo => !wo.deleted_at && (wo.bom_deducted === 1 || wo.bom_deducted === true))
    .toArray();

  for (const wo of linkedCompletedWOs) {
    const movs = Array.isArray(wo.bom_movements) ? [...wo.bom_movements] : [];
    let modified = false;
    for (let i = 0; i < movs.length; i++) {
      const m = movs[i];
      const coveredByInv = Number(m.already_deducted_by_invoice) || 0;
      if (m.material_id && coveredByInv > 0) {
        const availableToTransfer = Math.min(coveredByInv, Math.max(0, netRestoreByMat.get(m.material_id) || 0));
        if (availableToTransfer > 0) {
          netRestoreByMat.set(m.material_id, (netRestoreByMat.get(m.material_id) || 0) - availableToTransfer);
          movs[i] = {
            ...m,
            deducted_quantity: (Number(m.deducted_quantity) || 0) + availableToTransfer,
            already_deducted_by_invoice: Math.max(0, coveredByInv - availableToTransfer)
          };
          modified = true;
        }
      }
    }
    if (modified) {
      await db.work_orders.update(wo.id, {
        bom_movements: movs,
        updated_at: now,
        sync_status: 'PENDING'
      });
    }
  }

  return netRestoreByMat;
}

/**
 * When an invoice's amount_paid is reduced (paidDelta < 0), trims or soft-deletes
 * linked payment_vouchers so total active vouchers for that invoice never exceed newPaidAmount.
 */
export async function syncInvoiceVouchersOnPaidReduction(referenceId, newPaidAmount, now = new Date().toISOString()) {
  if (!db.payment_vouchers || !referenceId) return;
  const targetPaid = Math.max(0, Number(newPaidAmount) || 0);
  const vouchers = await db.payment_vouchers
    .where('reference_id')
    .equals(referenceId)
    .filter(v => !v.deleted_at)
    .toArray();

  if (vouchers.length === 0) return;

  // Sort oldest first so we keep earliest vouchers up to targetPaid and reduce/delete newest ones
  vouchers.sort((a, b) => String(a.created_at || a.voucher_date).localeCompare(String(b.created_at || b.voucher_date)));

  let runningAllowed = targetPaid;
  for (const v of vouchers) {
    const vAmt = Number(v.amount) || 0;
    if (runningAllowed <= 0.001) {
      await db.payment_vouchers.update(v.id, {
        deleted_at: now,
        updated_at: now,
        sync_status: 'PENDING'
      });
    } else if (vAmt > runningAllowed + 0.001) {
      const trimmed = Math.round(runningAllowed * 100) / 100;
      await db.payment_vouchers.update(v.id, {
        amount: trimmed,
        updated_at: now,
        sync_status: 'PENDING'
      });
      runningAllowed = 0;
    } else {
      runningAllowed -= vAmt;
    }
  }
}

/**
 * Recalculates a parent Sales Order or Purchase Order header (subtotal, total_amount, remaining_amount, payment_status)
 * and updates linked Customer/Supplier account_balance & PO expense when a line item is modified/deleted directly.
 */
export async function recalculateParentInvoiceFromItems(itemsTableName, orderId, now = new Date().toISOString()) {
  if (!orderId) return;
  const isPurchase = itemsTableName === 'purchase_items' || itemsTableName === 'purchase_order_items';
  const headerTable = isPurchase ? 'purchase_orders' : 'sales_orders';
  const foreignKey = isPurchase ? 'purchase_order_id' : 'sales_order_id';

  const header = await db[headerTable]?.get(orderId);
  if (!header || header.deleted_at) return;

  const allItems = await db[itemsTableName].where(foreignKey).equals(orderId).toArray();
  const activeItems = allItems.filter(i => !i.deleted_at);

  const newSubtotal = activeItems.reduce((sum, item) => {
    const lineTotal = item.total_price !== undefined && item.total_price !== null
      ? Number(item.total_price)
      : (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    return sum + (Number(lineTotal) || 0);
  }, 0);

  const discPct = Number(header.discount_percent) || 0;
  let discAmt = Number(header.discount_amount) || 0;
  if (discPct > 0) {
    discAmt = Math.round(((newSubtotal * discPct) / 100) * 100) / 100;
  } else if (discAmt > newSubtotal) {
    discAmt = newSubtotal;
  }

  const newTotal = Math.max(0, newSubtotal - discAmt);
  const paid = Number(header.amount_paid) || 0;
  const oldRemaining = (Number(header.total_amount) || 0) - paid;
  const newRemaining = newTotal - paid;
  const remDelta = newRemaining - oldRemaining;

  const newStatus = newTotal > 0
    ? (paid >= newTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID'))
    : (paid > 0 ? 'PAID' : 'UNPAID');

  await db[headerTable].update(orderId, {
    subtotal: newSubtotal,
    discount_amount: discAmt,
    total_amount: newTotal,
    remaining_amount: newRemaining,
    payment_status: newStatus,
    updated_at: now,
    sync_status: 'PENDING'
  });

  if (Math.abs(remDelta) > 0.0001) {
    if (isPurchase && header.supplier_id) {
      const supplier = await db.suppliers.get(header.supplier_id);
      if (supplier) {
        await db.suppliers.update(header.supplier_id, {
          account_balance: (Number(supplier.account_balance) || 0) + remDelta,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    } else if (!isPurchase && header.customer_id) {
      const customer = await db.customers.get(header.customer_id);
      if (customer) {
        await db.customers.update(header.customer_id, {
          account_balance: (Number(customer.account_balance) || 0) + remDelta,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    }
  }
}
