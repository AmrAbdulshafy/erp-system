import Dexie from 'dexie';

export const db = new Dexie('PackagingERP_DB');

db.version(17).stores({
  // Core HR
  employees: 'id, full_name, salary_type, is_active, sync_status',
  attendance: 'id, employee_id, work_date, status, sync_status',
  employee_loans: 'id, employee_id, loan_date, deduction_frequency, status, sync_status',
  
  // Payroll & Piece-Work
  employee_production: 'id, employee_id, work_order_id, production_date, sync_status',
  payroll: 'id, employee_id, period_start, period_end, status, sync_status',

  // Inventory & Factory
  raw_materials: 'id, category, material_name, sync_status',
  expenses: 'id, category, expense_date, sync_status',

  // Sales & CRM
  customers: 'id, customer_name, sync_status',
  quotations: 'id, customer_id, quote_date, status, sync_status',
  quotation_items: 'id, quotation_id, sync_status', 
  sales_orders: 'id, customer_id, order_date, payment_status, sync_status',
  sales_items: 'id, sales_order_id, sync_status',
  
  // Production Management
  work_orders: 'id, sales_order_id, status, start_date, sync_status',

  // Purchasing & Suppliers
  suppliers: 'id, supplier_name, sync_status',
  purchase_orders: 'id, supplier_id, order_date, payment_status, sync_status',
  purchase_items: 'id, purchase_order_id, raw_material_id, sync_status',

  // Auth
  users: 'id, employee_id, username, role, is_active, sync_status',

  // Shipping
  shipping_orders: 'id, sales_order_id, driver_name, shipping_status, sync_status',

  // Owner Equity / Drawings
  owner_withdrawals: 'id, owner_name, withdrawal_date, category, sync_status'
});

db.version(18).stores({
  raw_materials: 'id, category, material_name, supplier_id, sync_status'
});

db.version(19).stores({
  shipping_orders: 'id, sales_order_id, driver_name, shipping_status, sync_status'
}).upgrade(async tx => {
  await tx.table('shipping_orders').toCollection().modify(order => {
    if (order.vehicle_number && !order.bill_of_lading_number) {
      order.bill_of_lading_number = order.vehicle_number;
    }
  });
});

db.version(20).stores({
  stock_movements: 'id, material_id, movement_type, reference_type, reference_id, movement_date, sync_status',
  payment_vouchers: 'id, voucher_number, voucher_type, entity_type, entity_id, reference_id, voucher_date, sync_status'
}).upgrade(async tx => {
  const now = new Date().toISOString();

  // 1. Backfill stock_movements from embedded raw_materials.stock_movements if any exist
  try {
    const materials = await tx.table('raw_materials').toArray();
    const movTable = tx.table('stock_movements');
    for (const mat of materials) {
      if (Array.isArray(mat.stock_movements)) {
        for (let idx = 0; idx < mat.stock_movements.length; idx++) {
          const m = mat.stock_movements[idx];
          const movId = m.id || `mov-mig-${mat.id}-${idx}`;
          const qtyDelta = m.restored_quantity
            ? Number(m.restored_quantity)
            : -(Number(m.deducted_quantity) || 0);
          await movTable.put({
            id: movId,
            material_id: mat.id,
            material_name: mat.material_name || '',
            movement_type: qtyDelta >= 0 ? 'IN' : 'OUT',
            source: m.source || 'work_order_bom',
            reference_type: m.work_order_id ? 'work_order' : 'manual',
            reference_id: m.work_order_id || null,
            quantity: Math.abs(qtyDelta),
            direction: qtyDelta >= 0 ? 1 : -1,
            stock_before: Number(m.stock_before) || 0,
            stock_after: Number(m.stock_after) || 0,
            unit_cost: Number(mat.unit_price) || 0,
            movement_date: (m.created_at || now).split('T')[0],
            notes: m.source === 'work_order_bom' ? 'سحب خامات أمر شغل (BOM)' : 'حركة مخزن',
            sync_status: 'PENDING',
            created_at: m.created_at || now,
            updated_at: now,
            deleted_at: null
          });
        }
      }
    }
  } catch (e) {
    console.warn('Stock movement migration skipped:', e);
  }

  // 2. Backfill payment_vouchers from existing paid/partial sales_orders and purchase_orders
  try {
    const voucherTable = tx.table('payment_vouchers');
    const customers = await tx.table('customers').toArray();
    const custMap = new Map(customers.map(c => [c.id, c.customer_name]));
    const salesOrders = await tx.table('sales_orders').toArray();
    let seq = 1;
    for (const so of salesOrders) {
      if (so.deleted_at) continue;
      const paid = Number(so.amount_paid) || 0;
      if (paid > 0) {
        await voucherTable.put({
          id: `vch-so-init-${so.id}`,
          voucher_number: `RV-${String(seq++).padStart(4, '0')}`,
          voucher_type: 'RECEIPT',
          entity_type: 'customer',
          entity_id: so.customer_id || null,
          entity_name: custMap.get(so.customer_id) || '',
          reference_type: 'sales_order',
          reference_id: so.id,
          amount: paid,
          payment_method: 'CASH',
          voucher_date: so.order_date || (so.created_at || now).split('T')[0],
          notes: `دفعة مسجلة على فاتورة مبيعات #${String(so.id).slice(0, 8).toUpperCase()}`,
          sync_status: 'PENDING',
          created_at: so.created_at || now,
          updated_at: now,
          deleted_at: null
        });
      }
    }

    const suppliers = await tx.table('suppliers').toArray();
    const suppMap = new Map(suppliers.map(s => [s.id, s.supplier_name]));
    const purchaseOrders = await tx.table('purchase_orders').toArray();
    let pSeq = 1;
    for (const po of purchaseOrders) {
      if (po.deleted_at) continue;
      const paid = Number(po.amount_paid) || 0;
      if (paid > 0) {
        await voucherTable.put({
          id: `vch-po-init-${po.id}`,
          voucher_number: `PV-${String(pSeq++).padStart(4, '0')}`,
          voucher_type: 'PAYMENT',
          entity_type: 'supplier',
          entity_id: po.supplier_id || null,
          entity_name: suppMap.get(po.supplier_id) || '',
          reference_type: 'purchase_order',
          reference_id: po.id,
          amount: paid,
          payment_method: 'CASH',
          voucher_date: po.order_date || (po.created_at || now).split('T')[0],
          notes: `دفعة مسجلة على أمر شراء #${String(po.id).slice(0, 8).toUpperCase()}`,
          sync_status: 'PENDING',
          created_at: po.created_at || now,
          updated_at: now,
          deleted_at: null
        });
      }
    }
  } catch (e) {
    console.warn('Payment voucher migration skipped:', e);
  }
});
