import { db } from '../db';
import { getCompanyProfile } from './companyProfile';
import { getAlreadyDeductedBySalesOrder, recordStockMovement } from './inventoryMovements';

/**
 * Packaging ERP - Data-Driven Bill of Materials (BOM) Deduction Engine
 *
 * Deducts raw materials from warehouse inventory (db.raw_materials) by ID
 * based on actual produced quantities and per-unit consumption rates,
 * with bidirectional protection against double deduction when linked to a Sales Order.
 */

export async function deductWorkOrderBOM(workOrder) {
  if (!workOrder) {
    return { success: false, reason: 'no_work_order', message: 'أمر الشغل غير موجود' };
  }

  // Avoid duplicate deductions
  if (workOrder.bom_deducted === 1 || workOrder.bom_deducted === true) {
    return { success: false, reason: 'already_deducted', message: 'تم خصم الخامات لهذا الأمر مسبقاً' };
  }

  const now = new Date().toISOString();
  const companyProfile = getCompanyProfile();
  const fallbackRate = Number(companyProfile?.consumption_per_unit);

  // 1. Load linked sales order items (if sales_order_id is provided)
  let salesItems = [];
  let alreadyDeductedByInvoice = new Map();
  if (workOrder.sales_order_id) {
    try {
      const table = db.table('sales_items');
      if (table) {
        salesItems = await table
          .filter(i => !i.deleted_at && i.sales_order_id === workOrder.sales_order_id)
          .toArray();
      }
      alreadyDeductedByInvoice = await getAlreadyDeductedBySalesOrder(workOrder.sales_order_id);
    } catch (e) {
      console.error('Failed to query sales_items:', e);
    }
  }

  // 2. Determine produced quantity — no silent default
  const explicitOrderQty = Number(workOrder.quantity);
  const itemsTotalQty = salesItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const unitsProduced = Number.isFinite(explicitOrderQty) && explicitOrderQty > 0
    ? explicitOrderQty
    : itemsTotalQty;

  if (!unitsProduced || unitsProduced <= 0) {
    return {
      success: false,
      reason: 'no_quantity',
      message: 'معرفتش أحسب الخامات — الكمية مش محددة'
    };
  }

  // 3. Build deduction entries matched by material ID (with product_name fallback for legacy items)
  const targetEntries = salesItems.length > 0
    ? salesItems.map(item => ({
        material_id: item.material_id || item.raw_material_id || null,
        product_name: item.product_name || null,
        quantity: Number(item.quantity) || 0,
        consumption_per_unit: item.consumption_per_unit
      }))
    : (workOrder.material_id || workOrder.raw_material_id || workOrder.product_name || workOrder.item_name)
      ? [{
          material_id: workOrder.material_id || workOrder.raw_material_id || null,
          product_name: workOrder.product_name || workOrder.item_name || null,
          quantity: unitsProduced,
          consumption_per_unit: workOrder.consumption_per_unit
        }]
      : [];

  if (targetEntries.length === 0) {
    return {
      success: false,
      reason: 'no_materials_linked',
      message: 'لا توجد أصناف أو خامات مرتبطة بأمر الشغل لخصمها'
    };
  }

  // Validate all materials by ID and compute required deductions before mutating
  const fromSalesOrder = salesItems.length > 0;
  const allMats = await db.raw_materials.filter(m => !m.deleted_at).toArray();
  const matByName = new Map(allMats.map(m => [m.material_name, m]));
  const deductionPlan = new Map(); // material_id -> { material, totalDeducted, units, rate }

  for (const entry of targetEntries) {
    if (!entry.quantity || entry.quantity <= 0) continue;

    let matId = entry.material_id;
    if (!matId && entry.product_name && matByName.has(entry.product_name)) {
      matId = matByName.get(entry.product_name).id;
    }

    if (!matId) {
      return {
        success: false,
        reason: 'missing_material_id',
        message: 'يوجد صنف بدون معرّف خامة (material_id) — لا يمكن المطابقة بدون المعرّف'
      };
    }

    const material = await db.raw_materials.get(matId);
    if (!material || material.deleted_at) {
      return {
        success: false,
        reason: 'material_not_found',
        material_id: matId,
        message: `المادة المطلوبة غير موجودة في المخزن (المعرّف: ${matId})`
      };
    }

    const itemRate = Number(entry.consumption_per_unit);
    const materialRate = Number(material.consumption_per_unit);
    const rate = (Number.isFinite(itemRate) && itemRate > 0)
      ? itemRate
      : (Number.isFinite(materialRate) && materialRate > 0)
        ? materialRate
        : (Number.isFinite(fallbackRate) && fallbackRate > 0)
          ? fallbackRate
          : (fromSalesOrder ? 1 : null);

    if (!rate || rate <= 0) {
      return {
        success: false,
        reason: 'no_consumption_rate',
        material_id: material.id,
        message: `معدل الاستهلاك للوحدة (consumption_per_unit) غير محدد للصنف "${material.material_name}" ولا في إعدادات الشركة`
      };
    }

    const grossRequiredQty = entry.quantity * rate;

    const existing = deductionPlan.get(material.id);
    if (existing) {
      existing.grossRequired += grossRequiredQty;
      existing.units += entry.quantity;
    } else {
      deductionPlan.set(material.id, {
        material,
        grossRequired: grossRequiredQty,
        totalDeducted: 0,
        alreadyCoveredByInvoice: 0,
        units: entry.quantity,
        rate
      });
    }
  }

  // Subtract any quantity already deducted by the linked Sales Order invoice to prevent double deduction
  for (const [matId, plan] of deductionPlan.entries()) {
    const invoiceDeducted = Math.max(0, Number(alreadyDeductedByInvoice.get(matId)) || 0);
    const covered = Math.min(plan.grossRequired, invoiceDeducted);
    plan.alreadyCoveredByInvoice = covered;
    plan.totalDeducted = Math.max(0, plan.grossRequired - covered);
  }

  if (deductionPlan.size === 0) {
    return {
      success: false,
      reason: 'no_quantity',
      message: 'معرفتش أحسب الخامات — الكمية مش محددة'
    };
  }

  // 4. Execute deductions, allow negative stock, and record traceable movements in db.stock_movements
  const deductedMaterials = [];
  const movements = [];
  const insufficientItems = [];

  const txTables = [db.raw_materials, db.work_orders, db.stock_movements].filter(Boolean);
  await db.transaction('rw', txTables, async () => {
    for (const [matId, plan] of deductionPlan.entries()) {
      const freshMaterial = await db.raw_materials.get(matId);
      if (!freshMaterial || freshMaterial.deleted_at) {
        throw new Error(`المادة المطلوبة غير موجودة في المخزن (المعرّف: ${matId})`);
      }

      const currentStock = Number(freshMaterial.stock_quantity) || 0;
      const newStock = currentStock - plan.totalDeducted;
      const unitCost = Number(freshMaterial.unit_price) || 0;

      const movement = {
        created_at: now,
        source: 'work_order_bom',
        work_order_id: workOrder.id || null,
        sales_order_id: workOrder.sales_order_id || null,
        material_id: matId,
        material_name: freshMaterial.material_name,
        units_produced: plan.units,
        consumption_per_unit: plan.rate,
        gross_required_quantity: plan.grossRequired,
        already_deducted_by_invoice: plan.alreadyCoveredByInvoice,
        deducted_quantity: plan.totalDeducted,
        unit_cost: unitCost,
        total_cost: plan.grossRequired * unitCost,
        stock_before: currentStock,
        stock_after: newStock
      };

      if (plan.totalDeducted > 0) {
        const prevMovements = Array.isArray(freshMaterial.stock_movements)
          ? freshMaterial.stock_movements
          : [];

        await db.raw_materials.update(matId, {
          stock_quantity: newStock,
          stock_movements: [...prevMovements, movement],
          sync_status: 'MODIFIED',
          updated_at: now
        });

        await recordStockMovement({
          material_id: matId,
          material_name: freshMaterial.material_name,
          movement_type: 'OUT',
          source: 'work_order_bom',
          reference_type: 'work_order',
          reference_id: workOrder.id || null,
          quantity: plan.totalDeducted,
          direction: -1,
          stock_before: currentStock,
          stock_after: newStock,
          unit_cost: unitCost,
          movement_date: (workOrder.end_date || workOrder.start_date || now).split('T')[0],
          notes: `سحب تصنيع أمر شغل #${String(workOrder.id || '').slice(0, 8).toUpperCase()}${plan.alreadyCoveredByInvoice > 0 ? ` (تم استبعاد ${plan.alreadyCoveredByInvoice} مخصومة مسبقاً بالفاتورة)` : ''}`
        });
      }

      if (newStock < 0) {
        insufficientItems.push({
          id: matId,
          name: freshMaterial.material_name,
          deducted: plan.totalDeducted,
          remaining: newStock,
          unit: freshMaterial.unit || ''
        });
      }

      movements.push(movement);
      deductedMaterials.push({
        id: matId,
        name: freshMaterial.material_name,
        deducted: plan.totalDeducted,
        alreadyCoveredByInvoice: plan.alreadyCoveredByInvoice,
        remaining: newStock,
        unit: freshMaterial.unit || ''
      });
    }

    if (workOrder.id) {
      await db.work_orders.update(workOrder.id, {
        bom_deducted: 1,
        bom_units_produced: unitsProduced,
        bom_deducted_at: now,
        bom_movements: movements,
        sync_status: 'MODIFIED',
        updated_at: now
      });
    }
  });

  const hasInsufficientStock = insufficientItems.length > 0;

  return {
    success: true,
    unitsProduced,
    materials: deductedMaterials,
    movements,
    insufficientStock: hasInsufficientStock,
    insufficientItems,
    warningMessage: hasInsufficientStock ? 'المخزون مش كافي' : null
  };
}

/**
 * Revert BOM deductions by ID if a work order is moved back from COMPLETED to PENDING/IN_PROGRESS
 */
export async function revertWorkOrderBOM(workOrder) {
  if (!workOrder || (workOrder.bom_deducted !== 1 && workOrder.bom_deducted !== true)) {
    return { success: false, reason: 'not_deducted' };
  }

  const now = new Date().toISOString();
  const recordedMovements = Array.isArray(workOrder.bom_movements) ? workOrder.bom_movements : [];

  if (recordedMovements.length === 0) {
    return {
      success: false,
      reason: 'no_movements_recorded',
      message: 'لا توجد حركات خصم مسجلة لهذا الأمر لاستعادتها'
    };
  }

  const txTables = [db.raw_materials, db.work_orders, db.stock_movements].filter(Boolean);
  await db.transaction('rw', txTables, async () => {
    for (const mov of recordedMovements) {
      if (!mov.material_id) continue;
      const material = await db.raw_materials.get(mov.material_id);
      if (!material || material.deleted_at) continue;

      const restoreQty = Number(mov.deducted_quantity) || 0;
      if (restoreQty <= 0) continue;

      const currentStock = Number(material.stock_quantity) || 0;
      const newStock = currentStock + restoreQty;
      const unitCost = Number(material.unit_price) || 0;

      const revertMovement = {
        created_at: now,
        source: 'work_order_bom_revert',
        work_order_id: workOrder.id || null,
        material_id: material.id,
        material_name: material.material_name,
        restored_quantity: restoreQty,
        stock_before: currentStock,
        stock_after: newStock
      };

      const prevMovements = Array.isArray(material.stock_movements)
        ? material.stock_movements
        : [];

      await db.raw_materials.update(material.id, {
        stock_quantity: newStock,
        stock_movements: [...prevMovements, revertMovement],
        sync_status: 'MODIFIED',
        updated_at: now
      });

      await recordStockMovement({
        material_id: material.id,
        material_name: material.material_name,
        movement_type: 'IN',
        source: 'work_order_bom_revert',
        reference_type: 'work_order',
        reference_id: workOrder.id || null,
        quantity: restoreQty,
        direction: 1,
        stock_before: currentStock,
        stock_after: newStock,
        unit_cost: unitCost,
        movement_date: now.split('T')[0],
        notes: `إرجاع خامات أمر شغل ملغى #${String(workOrder.id || '').slice(0, 8).toUpperCase()}`
      });
    }

    if (workOrder.id) {
      await db.work_orders.update(workOrder.id, {
        bom_deducted: 0,
        bom_units_produced: 0,
        bom_movements: [],
        sync_status: 'MODIFIED',
        updated_at: now
      });
    }
  });

  return { success: true };
}
