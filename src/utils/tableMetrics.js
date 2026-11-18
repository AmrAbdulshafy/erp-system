import { 
  ShoppingCart, ShoppingBag, FileText, CheckCircle2, AlertCircle, 
  Package, Box, AlertTriangle, Receipt, Users, Banknote, Clock, 
  Truck, Award, TrendingUp, ClipboardList, Wallet 
} from 'lucide-react';

export function computeTableMetrics(tableName, records = [], relationsData = {}, t, isRTL) {
  if (!records || !Array.isArray(records)) return [];

  const count = records.length;

  const tr = (key, arText, enText) => {
    if (t && typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return isRTL ? arText : (enText || key);
  };

  switch (tableName) {
    case 'sales_orders': {
      const grossSales = records.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
      const paid = records.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
      const debt = Math.max(0, grossSales - paid);
      const paidOrders = records.filter(r => r.payment_status === 'PAID').length;

      return [
        {
          title: tr('total_gross_sales', 'إجمالي المبيعات', 'Total Gross Sales'),
          value: grossSales,
          isCurrency: true,
          icon: ShoppingCart,
          badgeColor: 'var(--primary)',
          subtitle: `${count} ${tr('orders', 'أوامر بيع', 'Orders')}`
        },
        {
          title: tr('actual_revenue_collected', 'الإيرادات المحصلة', 'Revenue Collected'),
          value: paid,
          isCurrency: true,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: `${paidOrders} ${tr('paid', 'مدفوعة كلياً', 'Paid Orders')}`
        },
        {
          title: tr('accounts_receivable', 'مستحقات العملاء (ديون)', 'Customer Debts'),
          value: debt,
          isCurrency: true,
          icon: AlertCircle,
          valueColor: debt > 0 ? '#EF4444' : 'inherit',
          badgeColor: '#EF4444',
          subtitle: isRTL ? 'مبالغ متبقية للتحصيل' : 'Uncollected payments'
        },
        {
          title: tr('total_sales_orders_logged', 'إجمالي أوامر البيع', 'Total Sales Orders'),
          value: count,
          icon: FileText,
          badgeColor: 'var(--accent)',
          subtitle: `${count - paidOrders} ${tr('pending', 'قيد السداد', 'Pending Payment')}`
        }
      ];
    }

    case 'purchase_orders': {
      const grossPurchases = records.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
      const paid = records.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
      const remaining = Math.max(0, grossPurchases - paid);
      const settled = records.filter(r => r.payment_status === 'PAID').length;

      return [
        {
          title: tr('total_purchases', 'إجمالي مشتريات المواد', 'Total Purchases'),
          value: grossPurchases,
          isCurrency: true,
          icon: ShoppingBag,
          badgeColor: 'var(--primary)',
          subtitle: `${count} ${tr('purchase_orders', 'أوامر شراء', 'Purchase Orders')}`
        },
        {
          title: tr('paid_to_suppliers', 'المسدد للموردين', 'Paid to Suppliers'),
          value: paid,
          isCurrency: true,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: `${settled} ${tr('settled', 'مسددة بالكامل', 'Settled Orders')}`
        },
        {
          title: tr('accounts_payable', 'مستحقات الموردين (دائن)', 'Supplier Payables'),
          value: remaining,
          isCurrency: true,
          icon: AlertCircle,
          valueColor: remaining > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'متبقي للسداد للموردين' : 'Remaining to pay'
        },
        {
          title: tr('purchase_orders', 'أوامر الشراء المسجلة', 'Purchase Orders'),
          value: count,
          icon: FileText,
          badgeColor: 'var(--accent)',
          subtitle: `${count - settled} ${tr('pending', 'متبقي دفعها', 'Pending Payments')}`
        }
      ];
    }

    case 'quotations': {
      const accepted = records.filter(r => r.status === 'ACCEPTED').length;
      const pending = records.filter(r => r.status === 'PENDING' || r.status === 'DRAFT').length;
      const rate = count > 0 ? Math.round((accepted / count) * 100) : 0;

      return [
        {
          title: tr('total_quotations', 'إجمالي عروض الأسعار', 'Total Quotations'),
          value: count,
          icon: FileText,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'كل عروض الأسعار الصادرة' : 'All issued quotations'
        },
        {
          title: tr('accepted_quotes', 'عروض مقبولة (معتمدة)', 'Accepted Quotes'),
          value: accepted,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'جاهزة للتحويل لأوامر بيع' : 'Ready for sales order'
        },
        {
          title: tr('pending_quotes', 'عروض قيد الانتظار', 'Pending Quotes'),
          value: pending,
          icon: Clock,
          valueColor: pending > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'في انتظار رد العميل' : 'Awaiting customer response'
        },
        {
          title: tr('acceptance_rate', 'نسبة قبول العروض', 'Acceptance Rate'),
          value: `${rate}%`,
          icon: TrendingUp,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'المقبولة مقارنة بالإجمالي' : 'Accepted vs Total'
        }
      ];
    }

    case 'raw_materials': {
      const totalUnits = records.reduce((s, r) => s + (Number(r.stock_quantity) || 0), 0);
      const lowStock = records.filter(r => Number(r.stock_quantity) <= Number(r.min_stock_alert || 0) && Number(r.stock_quantity) > 0).length;
      const outOfStock = records.filter(r => Number(r.stock_quantity) <= 0).length;

      return [
        {
          title: tr('total_raw_material_types', 'أنواع المواد بالمخزن', 'Material Types'),
          value: count,
          icon: Package,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'أصناف المواد الخام والكرتون' : 'Active inventory materials'
        },
        {
          title: tr('total_units_in_stock', 'إجمالي الكميات بالمخزن', 'Total Units in Stock'),
          value: totalUnits,
          icon: Box,
          valueColor: 'var(--primary)',
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'إجمالي رصيد جميع الأصناف' : 'Total warehouse balance'
        },
        {
          title: tr('low_stock_alerts', 'تنبيهات انخفاض الرصيد', 'Low Stock Alerts'),
          value: lowStock,
          icon: AlertTriangle,
          valueColor: lowStock > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'قاربت على حد الطلب الأدنى' : 'Near reorder threshold'
        },
        {
          title: tr('out_of_stock', 'أصناف نفدت بالكامل', 'Out of Stock'),
          value: outOfStock,
          icon: AlertCircle,
          valueColor: outOfStock > 0 ? '#EF4444' : 'inherit',
          badgeColor: '#EF4444',
          subtitle: isRTL ? 'تحتاج أمر شراء عاجل' : 'Requires immediate purchase'
        }
      ];
    }

    case 'expenses': {
      const totalExp = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const payrollExp = records.filter(r => r.category === 'PAYROLL').reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const materialExp = records.filter(r => r.category === 'MATERIALS').reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const transportExp = records.filter(r => r.category === 'TRANSPORT' || r.category === 'SHIPPING').reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const ownerExp = records.filter(r => r.category === 'PERSONAL' || (r.notes && r.notes.includes('[OWNER_WITHDRAWAL:'))).reduce((s, r) => s + (Number(r.amount) || 0), 0);

      return [
        {
          title: tr('total_expenses', 'إجمالي المصروفات', 'Total Expenses'),
          value: totalExp,
          isCurrency: true,
          icon: Receipt,
          valueColor: '#EF4444',
          badgeColor: '#EF4444',
          subtitle: `${count} ${isRTL ? 'شاملة المسحوبات والتشغيل' : 'Total operating & withdrawals'}`
        },
        {
          title: tr('payroll_expenses', 'مصروفات الرواتب والأجور', 'Payroll Expenses'),
          value: payrollExp,
          isCurrency: true,
          icon: Users,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'رواتب الموظفين وحوافز الإنتاج' : 'Employee wages & piece bonuses'
        },
        {
          title: tr('materials_expenses', 'مشتريات خامات الكرتون', 'Materials (POs)'),
          value: materialExp,
          isCurrency: true,
          icon: ShoppingBag,
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'المدفوع لأوامر شراء المواد' : 'Raw materials purchased'
        },
        {
          title: tr('owner_withdrawals', 'مسحوبات المالك', 'Owner Withdrawals'),
          value: ownerExp,
          isCurrency: true,
          icon: Wallet,
          valueColor: '#8B5CF6',
          badgeColor: '#8B5CF6',
          subtitle: isRTL ? 'مسحوبات شخصية وتوزيعات' : 'Personal & drawings'
        }
      ];
    }

    case 'payroll': {
      const totalNet = records.reduce((s, r) => s + (Number(r.net_pay) || 0), 0);
      const paid = records.filter(r => r.status === 'PAID').reduce((s, r) => s + (Number(r.net_pay) || 0), 0);
      const pending = records.filter(r => r.status !== 'PAID').reduce((s, r) => s + (Number(r.net_pay) || 0), 0);
      const totalBonus = records.reduce((s, r) => s + (Number(r.production_bonus) || 0), 0);

      return [
        {
          title: tr('total_net_payroll', 'إجمالي صافي الرواتب', 'Total Net Payroll'),
          value: totalNet,
          isCurrency: true,
          icon: Banknote,
          badgeColor: 'var(--primary)',
          subtitle: `${count} ${isRTL ? 'سجلات رواتب مسجلة' : 'Payroll cycles'}`
        },
        {
          title: tr('paid_salaries', 'الرواتب المصروفة فعلياً', 'Paid Salaries'),
          value: paid,
          isCurrency: true,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: `${records.filter(r => r.status === 'PAID').length} ${isRTL ? 'مسددة للموظف' : 'Disbursed'}`
        },
        {
          title: tr('pending_salaries', 'رواتب معلقة / مسودة', 'Pending Payroll'),
          value: pending,
          isCurrency: true,
          icon: Clock,
          valueColor: pending > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: `${records.filter(r => r.status !== 'PAID').length} ${isRTL ? 'في انتظار الصرف' : 'Awaiting payout'}`
        },
        {
          title: tr('production_bonus', 'حوافز إنتاج القطعة', 'Piece-Work Bonuses'),
          value: totalBonus,
          isCurrency: true,
          icon: Award,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'إجمالي بونص الإنتاجية' : 'Production bonuses paid'
        }
      ];
    }

    case 'shipping_orders': {
      const totalCost = records.reduce((s, r) => s + (Number(r.shipping_cost) || 0), 0);
      const delivered = records.filter(r => r.shipping_status === 'DELIVERED').length;
      const inTransit = records.filter(r => r.shipping_status !== 'DELIVERED').length;

      return [
        {
          title: tr('total_shipping_cost', 'إجمالي تكاليف الشحن', 'Total Shipping Cost'),
          value: totalCost,
          isCurrency: true,
          icon: Receipt,
          valueColor: '#EF4444',
          badgeColor: '#EF4444',
          subtitle: isRTL ? 'تضاف تلقائياً للمصروفات' : 'Auto-added to expenses'
        },
        {
          title: tr('delivered_orders', 'شحنات تم تسليمها', 'Delivered Shipments'),
          value: delivered,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'تم تسليمها للعميل بنجاح' : 'Completed deliveries'
        },
        {
          title: tr('in_transit_orders', 'قيد الشحن / معلقة', 'In Transit / Pending'),
          value: inTransit,
          icon: Truck,
          valueColor: inTransit > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'في الطريق أو قيد التجهيز' : 'Active on the road'
        },
        {
          title: tr('total_deliveries', 'إجمالي رحلات الشحن', 'Total Deliveries'),
          value: count,
          icon: Package,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'جميع سجلات التوصيل' : 'Total delivery logs'
        }
      ];
    }

    case 'employee_production': {
      const totalQty = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      const totalVal = records.reduce((s, r) => s + (Number(r.total_amount) || (Number(r.quantity || 0) * Number(r.rate_per_piece || 0))), 0);
      const boxes = records.filter(r => String(r.product_type).toLowerCase().includes('box')).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      const otherQty = Math.max(0, totalQty - boxes);

      return [
        {
          title: tr('total_units_produced', 'إجمالي الوحدات المنتجة', 'Total Units Produced'),
          value: totalQty,
          icon: Box,
          valueColor: 'var(--primary)',
          badgeColor: 'var(--primary)',
          subtitle: `${count} ${isRTL ? 'أمر إنتاج مسجل' : 'Production entries'}`
        },
        {
          title: tr('total_production_value', 'إجمالي قيمة الإنتاجية', 'Total Production Value'),
          value: totalVal,
          isCurrency: true,
          icon: Banknote,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'مستحقات العمال بالقطعة' : 'Labor piece-work earned'
        },
        {
          title: tr('boxes_produced', 'إنتاج الصناديق والكرتون', 'Boxes Produced'),
          value: boxes,
          icon: Package,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'صناديق كرتون مجمعة ومكسرة' : 'Carton box production'
        },
        {
          title: tr('cups_other_output', 'إنتاج الأكواب والأطباق', 'Cups & Other Items'),
          value: otherQty,
          icon: Award,
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'أكواب وصواني وأغطية' : 'Cups, trays & lids'
        }
      ];
    }

    case 'attendance': {
      const present = records.filter(r => r.status === 'PRESENT').length;
      const absent = records.filter(r => r.status === 'ABSENT').length;
      const lateLeaves = records.filter(r => r.status === 'LATE' || r.status === 'LEAVE').length;

      return [
        {
          title: tr('present', 'تسجيلات الحضور', 'Present Logs'),
          value: present,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'حضور مثبت بالوردية' : 'Confirmed on duty'
        },
        {
          title: tr('absent', 'حالات الغياب', 'Absent Logs'),
          value: absent,
          icon: AlertCircle,
          valueColor: absent > 0 ? '#EF4444' : 'inherit',
          badgeColor: '#EF4444',
          subtitle: isRTL ? 'غياب مسجل للعمال' : 'Unexcused absences'
        },
        {
          title: tr('late_leaves', 'تأخير / أذونات', 'Late / Leaves'),
          value: lateLeaves,
          icon: Clock,
          valueColor: lateLeaves > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'حضور متأخر أو إجازات' : 'Late arrivals or leaves'
        },
        {
          title: tr('total_attendance_logs', 'إجمالي تسجيلات الدوام', 'Total Logs'),
          value: count,
          icon: Users,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'سجلات البصمة والحضور' : 'Shift attendance records'
        }
      ];
    }

    case 'customers': {
      const totalDebt = records.reduce((s, r) => s + (Number(r.account_balance) || 0), 0);
      const withDebt = records.filter(r => Number(r.account_balance) > 0).length;
      const clearAccounts = records.filter(r => Number(r.account_balance) <= 0).length;

      return [
        {
          title: tr('total_customers', 'إجمالي العملاء', 'Total Customers'),
          value: count,
          icon: Users,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'العملاء المسجلين بالنظام' : 'Active customer accounts'
        },
        {
          title: tr('accounts_receivable', 'إجمالي ديون العملاء', 'Total Debts (Receivable)'),
          value: totalDebt,
          isCurrency: true,
          icon: AlertCircle,
          valueColor: totalDebt > 0 ? '#EF4444' : 'inherit',
          badgeColor: '#EF4444',
          subtitle: isRTL ? 'مستحقات المصنع لدى العملاء' : 'Total money owed to you'
        },
        {
          title: tr('active_debtors', 'عملاء عليهم مستحقات', 'Clients with Balance'),
          value: withDebt,
          icon: Clock,
          valueColor: withDebt > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'حسابات غير مسددة بالكامل' : 'Accounts with open balance'
        },
        {
          title: tr('settled_clients', 'حسابات مسددة (رصيد صفر)', 'Settled Accounts'),
          value: clearAccounts,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'لا توجد عليهم مديونيات' : 'Zero debt balance'
        }
      ];
    }

    case 'suppliers': {
      const totalLiabilities = records.reduce((s, r) => s + (Number(r.account_balance) || 0), 0);
      const withBalance = records.filter(r => Number(r.account_balance) > 0).length;
      const clearSuppliers = records.filter(r => Number(r.account_balance) <= 0).length;

      return [
        {
          title: tr('total_suppliers', 'إجمالي الموردين', 'Total Suppliers'),
          value: count,
          icon: Truck,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'موردي الخامات والكرتون' : 'Raw material vendors'
        },
        {
          title: tr('accounts_payable', 'مستحقات للموردين', 'Supplier Payables'),
          value: totalLiabilities,
          isCurrency: true,
          icon: AlertCircle,
          valueColor: totalLiabilities > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'ديون المصنع للموردين' : 'Total money you owe'
        },
        {
          title: tr('suppliers_with_dues', 'موردين لهم مستحقات', 'Vendors with Dues'),
          value: withBalance,
          icon: Clock,
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'فواتير في انتظار السداد' : 'Pending invoice payouts'
        },
        {
          title: tr('fully_paid_vendors', 'موردين مسددين بالكامل', 'Settled Suppliers'),
          value: clearSuppliers,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'رصيد صفر (لا مستحقات)' : 'Zero dues balance'
        }
      ];
    }

    case 'employees': {
      const active = records.filter(r => r.is_active !== 0 && r.is_active !== false).length;
      const pieceStaff = records.filter(r => String(r.salary_type).toUpperCase().includes('PIECE')).length;
      const salaryStaff = Math.max(0, count - pieceStaff);

      return [
        {
          title: tr('total_employees', 'إجمالي الموظفين', 'Total Employees'),
          value: count,
          icon: Users,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'كادر العمل والعمالة' : 'Factory workforce'
        },
        {
          title: tr('active', 'العمالة النشطة', 'Active Staff'),
          value: active,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'على رأس العمل حالياً' : 'Currently employed'
        },
        {
          title: tr('piece_work', 'عمالة بالقطعة', 'Piece-Work Operators'),
          value: pieceStaff,
          icon: Award,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'محاسبة بإنتاجية القطعة' : 'Paid per piece manufactured'
        },
        {
          title: tr('fixed_salary', 'رواتب ثابتة / شهرية', 'Salary Staff'),
          value: salaryStaff,
          icon: Banknote,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'رواتب شهرية وأسبوعية' : 'Fixed salary personnel'
        }
      ];
    }

    case 'work_orders': {
      const completed = records.filter(r => r.status === 'COMPLETED').length;
      const inProgress = count - completed;
      const linked = records.filter(r => r.sales_order_id).length;

      return [
        {
          title: tr('total_work_orders', 'إجمالي أوامر الشغل', 'Total Work Orders'),
          value: count,
          icon: ClipboardList,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'أوامر تصنيع المصنع' : 'Factory manufacturing orders'
        },
        {
          title: tr('in_progress', 'قيد التنفيذ / الانتظار', 'In Progress / Pending'),
          value: inProgress,
          icon: Clock,
          valueColor: inProgress > 0 ? '#F59E0B' : 'inherit',
          badgeColor: '#F59E0B',
          subtitle: isRTL ? 'على خط الإنتاج بالمصنع' : 'Active on the floor'
        },
        {
          title: tr('completed', 'أوامر شغل مكتملة', 'Completed Jobs'),
          value: completed,
          icon: CheckCircle2,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'تم إنتاجها وتجهيزها' : 'Finished manufacturing'
        },
        {
          title: tr('linked_sales_orders', 'مرتبطة بأوامر بيع', 'Linked to Sales'),
          value: linked,
          icon: ShoppingCart,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'إنتاج مخصص لطلبيات عملاء' : 'Tied to customer orders'
        }
      ];
    }

    case 'owner_withdrawals': {
      const totalAmount = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const personal = records.filter(r => r.category === 'PERSONAL').reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const profitShare = records.filter(r => r.category === 'PROFIT_SHARE').reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const other = Math.max(0, totalAmount - personal - profitShare);

      return [
        {
          title: tr('total_owner_withdrawals', 'إجمالي مسحوبات المالك', 'Total Owner Withdrawals'),
          value: totalAmount,
          isCurrency: true,
          icon: Wallet,
          valueColor: '#8B5CF6',
          badgeColor: '#8B5CF6',
          subtitle: `${count} ${isRTL ? 'عملية سحب مسجلة' : 'Withdrawal transactions'}`
        },
        {
          title: tr('personal_withdrawals', 'مسحوبات شخصية', 'Personal Drawings'),
          value: personal,
          isCurrency: true,
          icon: Users,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'سحوبات مصاريف شخصية' : 'Personal expenses drawings'
        },
        {
          title: tr('profit_share_withdrawals', 'توزيعات أرباح', 'Profit Distributions'),
          value: profitShare,
          isCurrency: true,
          icon: TrendingUp,
          valueColor: '#10B981',
          badgeColor: '#10B981',
          subtitle: isRTL ? 'أرباح موزعة على المالك' : 'Dividends & profit payouts'
        },
        {
          title: tr('other_withdrawals', 'مسحوبات أخرى / رواتب', 'Other Withdrawals'),
          value: other,
          isCurrency: true,
          icon: Banknote,
          badgeColor: 'var(--accent)',
          subtitle: isRTL ? 'سلف ورواتب شركاء' : 'Loans, partner salary & other'
        }
      ];
    }

    default: {
      return [
        {
          title: tr('total_records', 'إجمالي السجلات', 'Total Records'),
          value: count,
          icon: FileText,
          badgeColor: 'var(--primary)',
          subtitle: isRTL ? 'السجلات المسجلة بالنظام' : 'Total active records'
        }
      ];
    }
  }
}
