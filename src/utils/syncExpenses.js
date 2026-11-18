import { db } from '../db';

/**
 * Ensures that all past or existing records in payroll, shipping, and purchase orders
 * that involve financial costs are present in db.expenses.
 * Respects soft-deleted expenses (deleted_at) so deleted linked expenses never reappear,
 * uses deterministic IDs (exp-payroll-<id>, exp-shipping-<id>, exp-po-<id>),
 * and runs at most once per day via localStorage flag syncExpenses_done_<date>.
 */
export async function syncAllLinkedExpenses() {
  try {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const flagKey = `syncExpenses_done_${today}`;

    if (typeof window !== 'undefined' && localStorage.getItem(flagKey)) {
      return;
    }

    // Read ALL expenses (including soft-deleted ones without filtering deleted_at)
    let allExpenses = await db.expenses.toArray();

    // 0. Auto-clean any duplicate ACTIVE synced expenses in IndexedDB
    const seenActiveLinked = {};
    for (const exp of allExpenses) {
      if (exp.deleted_at || !exp.notes) continue;
      const match = exp.notes.match(/\[(PAYROLL|SHIPPING|PO|OWNER_WITHDRAWAL):([^\]]+)\]/);
      if (match) {
        const key = match[0];
        if (!seenActiveLinked[key]) {
          seenActiveLinked[key] = exp.id;
        } else {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }
    }

    // Re-fetch all expenses (including soft-deleted) after deduplicating active ones
    allExpenses = await db.expenses.toArray();

    // 1. Sync Payroll -> Expenses (ONLY when status === 'PAID')
    const payrollRecords = await db.payroll.filter(p => !p.deleted_at).toArray();
    for (const p of payrollRecords) {
      const isPaid = String(p.status || p.payment_status || '').toUpperCase() === 'PAID';
      const netPay = Number(p.net_pay) || 0;
      const loanDed = Number(p.loan_deductions) || 0;
      const totalEarnedWage = netPay + loanDed;

      const deterministicId = `exp-payroll-${p.id}`;
      const existingExp = allExpenses.find(
        e => e.id === deterministicId || (e.notes && e.notes.includes(`[PAYROLL:${p.id}]`))
      );

      // If payroll is not PAID (e.g. DRAFT or APPROVED), ensure no active expense exists for it
      if (!isPaid || totalEarnedWage <= 0) {
        if (existingExp && !existingExp.deleted_at) {
          await db.expenses.update(existingExp.id, {
            deleted_at: now,
            updated_at: now,
            sync_status: 'PENDING'
          });
        }
        continue;
      }

      // If it exists and was explicitly soft-deleted while already PAID -> do nothing
      if (existingExp && existingExp.deleted_at) {
        continue;
      }

      if (!existingExp) {
        let empName = '';
        if (p.employee_id) {
          const emp = await db.employees.get(p.employee_id);
          empName = emp?.full_name || '';
        }
        await db.expenses.put({
          id: deterministicId,
          category: 'PAYROLL',
          amount: totalEarnedWage,
          expense_date: p.period_end || p.period_start || today,
          notes: `[PAYROLL:${p.id}] ${p.employee_id ? `[EMP:${p.employee_id}] ` : ''}Payroll for ${empName || 'Employee'} (${p.period_start || ''} to ${p.period_end || ''})${loanDed > 0 ? ` [Net Cash: ${netPay} + Loan Deducted: ${loanDed}]` : ''} - Status: PAID`,
          recorded_by: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          sync_status: 'PENDING'
        });
      } else if (Number(existingExp.amount) !== totalEarnedWage) {
        await db.expenses.put({
          ...existingExp,
          amount: totalEarnedWage,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    }

    // 2. Sync Shipping & Delivery -> Expenses
    const shippingRecords = await db.shipping_orders.filter(s => !s.deleted_at).toArray();
    for (const s of shippingRecords) {
      const cost = Number(s.shipping_cost) || 0;
      if (cost <= 0) continue;

      const deterministicId = `exp-shipping-${s.id}`;
      const existingExp = allExpenses.find(
        e => e.id === deterministicId || (e.notes && e.notes.includes(`[SHIPPING:${s.id}]`))
      );

      // If it exists and is soft-deleted -> do nothing
      if (existingExp && existingExp.deleted_at) {
        continue;
      }

      if (!existingExp) {
        let soDisplay = '';
        let customerName = '';
        if (s.sales_order_id) {
          const so = await db.sales_orders.get(s.sales_order_id);
          if (so) {
            soDisplay = `#${String(so.id).slice(0, 8).toUpperCase()}`;
            if (so.customer_id) {
              const cust = await db.customers.get(so.customer_id);
              customerName = cust?.customer_name || '';
            }
          }
        }
        await db.expenses.put({
          id: deterministicId,
          category: 'SHIPPING',
          amount: cost,
          expense_date: s.shipping_date || today,
          notes: `[SHIPPING:${s.id}] ${s.sales_order_id ? `[SO:${s.sales_order_id}] ` : ''}Shipping & Delivery for Sales Order ${soDisplay}${customerName ? ' (' + customerName + ')' : ''}${s.driver_name ? ' - Driver: ' + s.driver_name : ''}`,
          recorded_by: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          sync_status: 'PENDING'
        });
      } else if (Number(existingExp.amount) !== cost) {
        await db.expenses.put({
          ...existingExp,
          amount: cost,
          category: 'SHIPPING',
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    }

    // 3. Sync Purchase Orders (Materials) -> Expenses
    const poRecords = await db.purchase_orders.filter(po => !po.deleted_at).toArray();
    for (const po of poRecords) {
      const paid = Number(po.amount_paid) || 0;
      if (paid <= 0) continue;

      const deterministicId = `exp-po-${po.id}`;
      const existingExp = allExpenses.find(
        e => e.id === deterministicId || (e.notes && e.notes.includes(`[PO:${po.id}]`))
      );

      // If it exists and is soft-deleted -> do nothing
      if (existingExp && existingExp.deleted_at) {
        continue;
      }

      if (!existingExp) {
        let supplierName = '';
        if (po.supplier_id) {
          const sup = await db.suppliers.get(po.supplier_id);
          supplierName = sup?.supplier_name || '';
        }
        await db.expenses.put({
          id: deterministicId,
          category: 'MATERIALS',
          amount: paid,
          expense_date: po.order_date || today,
          notes: `[PO:${po.id}] ${supplierName ? supplierName + ' - ' : ''}Raw Materials Purchase`,
          recorded_by: po.recorded_by || null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          sync_status: 'PENDING'
        });
      } else if (Number(existingExp.amount) !== paid) {
        await db.expenses.put({
          ...existingExp,
          amount: paid,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
    }

    // 4. Sync Owner Withdrawals -> Expenses
    if (db.owner_withdrawals) {
      const withdrawalRecords = await db.owner_withdrawals.filter(w => !w.deleted_at).toArray();
      for (const w of withdrawalRecords) {
        const amt = Number(w.amount) || 0;
        if (amt <= 0) continue;

        const deterministicId = `exp-withdrawal-${w.id}`;
        const existingExp = allExpenses.find(
          e => e.id === deterministicId || (e.notes && e.notes.includes(`[OWNER_WITHDRAWAL:${w.id}]`))
        );

        // If it exists and is soft-deleted -> do nothing
        if (existingExp && existingExp.deleted_at) {
          continue;
        }

        if (!existingExp) {
          await db.expenses.put({
            id: deterministicId,
            category: 'PERSONAL',
            amount: amt,
            expense_date: w.withdrawal_date || today,
            notes: `[OWNER_WITHDRAWAL:${w.id}] Owner Withdrawal: ${w.owner_name || 'Owner'} (${w.category || 'PERSONAL'})${w.notes ? ' - ' + w.notes : ''}`,
            recorded_by: null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            sync_status: 'PENDING'
          });
        } else if (Number(existingExp.amount) !== amt || existingExp.expense_date !== w.withdrawal_date) {
          await db.expenses.put({
            ...existingExp,
            amount: amt,
            expense_date: w.withdrawal_date || existingExp.expense_date,
            updated_at: now,
            sync_status: 'PENDING'
          });
        }
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(flagKey, '1');
    }
  } catch (err) {
    console.error('Error syncing linked expenses:', err);
  }
}

export async function syncPayrollExpense(p) {
  if (!p?.id) return;
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const isPaid = String(p.status || p.payment_status || '').toUpperCase() === 'PAID';
  const netPay = Number(p.net_pay) || 0;
  const loanDed = Number(p.loan_deductions) || 0;
  const totalEarnedWage = netPay + loanDed;
  const deterministicId = `exp-payroll-${p.id}`;
  const existingExp = await db.expenses
    .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[PAYROLL:${p.id}]`)))
    .first();

  if (!isPaid || totalEarnedWage <= 0) {
    if (existingExp && !existingExp.deleted_at) {
      await db.expenses.update(existingExp.id, { deleted_at: now, updated_at: now, sync_status: 'PENDING' });
    }
    return;
  }

  let empName = '';
  if (p.employee_id) {
    const emp = await db.employees.get(p.employee_id);
    empName = emp?.full_name || '';
  }
  await db.expenses.put({
    id: existingExp ? existingExp.id : deterministicId,
    category: 'PAYROLL',
    amount: totalEarnedWage,
    expense_date: p.period_end || p.period_start || today,
    notes: `[PAYROLL:${p.id}] ${p.employee_id ? `[EMP:${p.employee_id}] ` : ''}Payroll for ${empName || 'Employee'} (${p.period_start || ''} to ${p.period_end || ''})${loanDed > 0 ? ` [Net Cash: ${netPay} + Loan Deducted: ${loanDed}]` : ''} - Status: PAID`,
    recorded_by: null,
    created_at: existingExp?.created_at || now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'PENDING'
  });
}

export async function syncShippingExpense(s) {
  if (!s?.id) return;
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const cost = Number(s.shipping_cost) || 0;
  const deterministicId = `exp-shipping-${s.id}`;
  const existingExp = await db.expenses
    .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[SHIPPING:${s.id}]`)))
    .first();

  if (existingExp && existingExp.deleted_at) return;

  if (cost > 0) {
    let soDisplay = '';
    let customerName = '';
    if (s.sales_order_id) {
      const so = await db.sales_orders.get(s.sales_order_id);
      if (so) {
        soDisplay = `#${String(so.id).slice(0, 8).toUpperCase()}`;
        if (so.customer_id) {
          const cust = await db.customers.get(so.customer_id);
          customerName = cust?.customer_name || '';
        }
      }
    }
    await db.expenses.put({
      id: existingExp ? existingExp.id : deterministicId,
      category: 'SHIPPING',
      amount: cost,
      expense_date: s.shipping_date || today,
      notes: `[SHIPPING:${s.id}] ${s.sales_order_id ? `[SO:${s.sales_order_id}] ` : ''}Shipping & Delivery for Sales Order ${soDisplay}${customerName ? ' (' + customerName + ')' : ''}${s.driver_name ? ' - Driver: ' + s.driver_name : ''}`,
      recorded_by: null,
      created_at: existingExp?.created_at || now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'PENDING'
    });
  } else if (existingExp) {
    await db.expenses.update(existingExp.id, { deleted_at: now, sync_status: 'PENDING' });
  }
}

export async function syncPurchaseOrderExpense(po) {
  if (!po?.id) return;
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const paid = Number(po.amount_paid) || 0;
  const deterministicId = `exp-po-${po.id}`;
  const existingExp = await db.expenses
    .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[PO:${po.id}]`)))
    .first();

  if (existingExp && existingExp.deleted_at) return;

  if (paid > 0) {
    let supplierName = '';
    if (po.supplier_id) {
      const sup = await db.suppliers.get(po.supplier_id);
      supplierName = sup?.supplier_name || '';
    }
    await db.expenses.put({
      id: existingExp ? existingExp.id : deterministicId,
      category: 'MATERIALS',
      amount: paid,
      expense_date: po.order_date || today,
      notes: `[PO:${po.id}] ${supplierName ? supplierName + ' - ' : ''}Raw Materials Purchase`,
      recorded_by: po.recorded_by || null,
      created_at: existingExp?.created_at || now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'PENDING'
    });
  } else if (existingExp) {
    await db.expenses.update(existingExp.id, { deleted_at: now, sync_status: 'PENDING' });
  }
}

export async function syncWithdrawalExpense(w) {
  if (!w?.id) return;
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const amt = Number(w.amount) || 0;
  const deterministicId = `exp-withdrawal-${w.id}`;
  const existingExp = await db.expenses
    .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[OWNER_WITHDRAWAL:${w.id}]`)))
    .first();

  if (existingExp && existingExp.deleted_at) return;

  if (amt > 0) {
    await db.expenses.put({
      id: existingExp ? existingExp.id : deterministicId,
      category: 'PERSONAL',
      amount: amt,
      expense_date: w.withdrawal_date || today,
      notes: `[OWNER_WITHDRAWAL:${w.id}] Owner Withdrawal: ${w.owner_name || 'Owner'} (${w.category || 'PERSONAL'})${w.notes ? ' - ' + w.notes : ''}`,
      recorded_by: null,
      created_at: existingExp?.created_at || now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'PENDING'
    });
  } else if (existingExp) {
    await db.expenses.update(existingExp.id, { deleted_at: now, sync_status: 'PENDING' });
  }
}
