/**
 * Jin Engine ERP - Roles & Permission Matrix Engine
 * 
 * Manages screen access rights, role definitions, and dynamic access control (RBAC).
 */

export const SYSTEM_SCREENS = [
  // Overview & Intelligence
  { id: 'dashboard', path: '/', labelAr: 'لوحة التحكم والقيادة', labelEn: 'Dashboard & Executive Center', group: 'overview' },
  { id: 'reports', path: '/reports', labelAr: 'التقارير المالية والتنفيذية الشاملة', labelEn: 'Financial & Executive Reports', group: 'overview' },
  { id: 'profile', path: '/profile', labelAr: 'الملفات الشاملة (بروفايل الجهات والموظفين)', labelEn: 'Entity Profiles Directory', group: 'overview' },

  // Commercial & Sales
  { id: 'quotations', path: '/quotations', labelAr: 'عروض الأسعار وحاسبة الكرتون', labelEn: 'Quotations & Packaging Estimator', group: 'sales' },
  { id: 'quotation-items', path: '/quotation-items', labelAr: 'بنود وتفاصيل عروض الأسعار', labelEn: 'Quotation Items Details', group: 'sales' },
  { id: 'sales', path: '/sales', labelAr: 'أوامر البيع وفواتير العملاء', labelEn: 'Sales Orders & Invoices', group: 'sales' },
  { id: 'sales-items', path: '/sales-items', labelAr: 'بنود طلبات البيع والفواتير', labelEn: 'Sales Items Details', group: 'sales' },
  { id: 'customers', path: '/customers', labelAr: 'العملاء وحساباتهم والمديونيات', labelEn: 'Customers & Receivables', group: 'sales' },

  // Factory & Manufacturing
  { id: 'work-orders', path: '/work-orders', labelAr: 'أوامر الشغل وخطوط الإنتاج والتصنيع', labelEn: 'Factory Work Orders & Routing', group: 'manufacturing' },
  { id: 'production', path: '/production', labelAr: 'سجل الإنتاج والقطعيات على الماكينات', labelEn: 'Machine Production Log', group: 'manufacturing' },
  { id: 'inventory', path: '/inventory', labelAr: 'المخزن وإدارة الخامات ورولات الورق', labelEn: 'Warehouse & Raw Materials (BOM)', group: 'manufacturing' },

  // Purchasing & Suppliers
  { id: 'purchases', path: '/purchases', labelAr: 'أوامر شراء الخامات ومستلزمات الإنتاج', labelEn: 'Purchase Orders & Raw Contracts', group: 'purchasing' },
  { id: 'purchase-items', path: '/purchase-items', labelAr: 'بنود فواتير الشراء والتوريد', labelEn: 'Purchase Items Details', group: 'purchasing' },
  { id: 'suppliers', path: '/suppliers', labelAr: 'الموردين وحساباتهم والدائنين', labelEn: 'Suppliers & Payables', group: 'purchasing' },

  // Logistics & Delivery
  { id: 'shipping', path: '/shipping', labelAr: 'الشحن والتوصيل وحركات السيارات', labelEn: 'Shipping, Fleet & Delivery', group: 'logistics' },

  // Finance, Expenses & Loans
  { id: 'expenses', path: '/expenses', labelAr: 'المصروفات العامة والتكاليف التشغيلية', labelEn: 'Operating Expenses & Costs', group: 'finance' },
  { id: 'owner-withdrawals', path: '/owner-withdrawals', labelAr: 'مسحوبات المالك وتوزيعات الأرباح', labelEn: 'Owner Equity Withdrawals', group: 'finance' },
  { id: 'payroll', path: '/payroll', labelAr: 'الرواتب والأجور ومستحقات الإنتاج', labelEn: 'Payroll & Piece-Rate Wages', group: 'finance' },
  { id: 'loans', path: '/loans', labelAr: 'سلف وقروض الموظفين وجدولة الاستقطاع', labelEn: 'Employee Loans & Advance Deductions', group: 'finance' },

  // Human Resources
  { id: 'employees', path: '/employees', labelAr: 'الموظفين والعمال والبيانات الوظيفية', labelEn: 'Employees Directory', group: 'hr' },
  { id: 'attendance', path: '/attendance', labelAr: 'سجل الحضور والغياب والانصراف', labelEn: 'Attendance & Time Tracking', group: 'hr' },

  // Administration, Security & Full System Settings
  { id: 'users', path: '/users', labelAr: 'إدارة المستخدمين ومصفوفة الصلاحيات (RBAC)', labelEn: 'Users & Permission Matrix (RBAC)', group: 'admin' },
  { id: 'tutorial', path: '/tutorial', labelAr: 'دليل التشغيل والمحاسبة المصور (PDF)', labelEn: 'Illustrated Operations Manual (PDF)', group: 'admin' },
  { id: 'settings', path: '/settings', labelAr: 'إعدادات المنظومة وهوية المصنع (اللوجو، البيانات، الضريبة)', labelEn: 'Company Profile & General Branding', group: 'admin' },
  { id: 'settings-server', path: '/settings/server', labelAr: 'إعدادات السيرفر الأونلاين ومزامنة MySQL السحابية', labelEn: 'Cloud Server & MySQL Sync Settings', group: 'admin' },
  { id: 'database-backup', path: '/settings/database', labelAr: 'النسخ الاحتياطي واستعادة قواعد البيانات (Backup & Restore Hub)', labelEn: 'Database Backup & Restore Hub', group: 'admin' }
];

export const DEFAULT_ROLES = [
  { key: 'ADMIN', nameAr: 'مدير النظام (كامل الصلاحيات)', nameEn: 'System Administrator', isSystem: true, badgeColor: '#3B82F6' },
  { key: 'ACCOUNTANT', nameAr: 'محاسب مالي ورئيس حسابات', nameEn: 'Chief Accountant', isSystem: false, badgeColor: '#10B981' },
  { key: 'SUPERVISOR', nameAr: 'مشرف إنتاج / مصنع', nameEn: 'Production Supervisor', isSystem: false, badgeColor: '#F59E0B' },
  { key: 'SALES', nameAr: 'مسؤول مبيعات وتسويق', nameEn: 'Sales Representative', isSystem: false, badgeColor: '#8B5CF6' },
  { key: 'STOREKEEPER', nameAr: 'أمين مخزن وخامات', nameEn: 'Warehouse Keeper', isSystem: false, badgeColor: '#EC4899' }
];

export const DEFAULT_DEPARTMENTS = [
  { key: 'EXECUTIVE', nameAr: 'الإدارة التنفيذية والعامة', nameEn: 'Executive & General Management', defaultRole: 'ADMIN' },
  { key: 'FINANCE', nameAr: 'الإدارة المالية والحسابات', nameEn: 'Finance & Accounting', defaultRole: 'ACCOUNTANT' },
  { key: 'SALES', nameAr: 'إدارة المبيعات والتسويق', nameEn: 'Sales & Marketing', defaultRole: 'SALES' },
  { key: 'MANUFACTURING', nameAr: 'إدارة الإنتاج والتشغيل', nameEn: 'Production & Manufacturing', defaultRole: 'SUPERVISOR' },
  { key: 'WAREHOUSE', nameAr: 'المستودعات والخامات', nameEn: 'Warehouse & Raw Materials', defaultRole: 'STOREKEEPER' },
  { key: 'LOGISTICS', nameAr: 'الحركة واللوجستيات والشحن', nameEn: 'Logistics & Dispatch', defaultRole: 'STOREKEEPER' },
  { key: 'HR', nameAr: 'الموارد البشرية وشؤون الموظفين', nameEn: 'Human Resources', defaultRole: 'ACCOUNTANT' }
];

// Default screen paths mapping for roles
export const DEFAULT_PERMISSION_MATRIX = {
  ADMIN: SYSTEM_SCREENS.map(s => s.path),
  ACCOUNTANT: [
    '/', '/reports', '/profile', '/quotations', '/quotation-items', '/sales', '/sales-items',
    '/purchases', '/purchase-items', '/expenses', '/owner-withdrawals',
    '/customers', '/suppliers', '/employees', '/payroll', '/loans', '/inventory', '/tutorial',
    '/settings'
  ],
  SUPERVISOR: [
    '/', '/profile', '/work-orders', '/production', '/inventory', '/attendance', '/employees', '/shipping', '/tutorial'
  ],
  SALES: [
    '/', '/profile', '/quotations', '/quotation-items', '/sales', '/sales-items', '/customers', '/shipping', '/tutorial'
  ],
  STOREKEEPER: [
    '/', '/profile', '/inventory', '/purchases', '/purchase-items', '/suppliers', '/shipping', '/tutorial'
  ]
};

const MATRIX_STORAGE_KEY = 'jin_engine_permission_matrix';
const ROLES_STORAGE_KEY = 'jin_engine_roles';
const DEPARTMENTS_STORAGE_KEY = 'jin_engine_departments';

/**
 * Retrieve departments from localStorage or defaults
 */
export function getStoredDepartments() {
  if (typeof window === 'undefined') return DEFAULT_DEPARTMENTS;
  try {
    const raw = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
    if (!raw) return DEFAULT_DEPARTMENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEPARTMENTS;
  } catch (e) {
    console.error('Error loading stored departments:', e);
    return DEFAULT_DEPARTMENTS;
  }
}

/**
 * Save departments to localStorage
 */
export function saveStoredDepartments(departments) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(departments));
  setTimeout(() => {
    window.dispatchEvent(new Event('permission-matrix-updated'));
  }, 0);
}


/**
 * Retrieve roles from localStorage or fallback to defaults
 */
export function getStoredRoles() {
  if (typeof window === 'undefined') return DEFAULT_ROLES;
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return DEFAULT_ROLES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ROLES;
  } catch (e) {
    console.error('Error loading stored roles:', e);
    return DEFAULT_ROLES;
  }
}

/**
 * Save roles to localStorage
 */
export function saveStoredRoles(roles) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  setTimeout(() => {
    window.dispatchEvent(new Event('permission-matrix-updated'));
  }, 0);
}

/**
 * Retrieve permission matrix from localStorage or fallback to defaults
 */
export function getStoredMatrix() {
  if (typeof window === 'undefined') return DEFAULT_PERMISSION_MATRIX;
  try {
    const raw = localStorage.getItem(MATRIX_STORAGE_KEY);
    if (!raw) return DEFAULT_PERMISSION_MATRIX;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PERMISSION_MATRIX;
    
    // Ensure all standard and custom roles exist in the matrix object
    const roles = getStoredRoles();
    for (const role of roles) {
      if (!Array.isArray(parsed[role.key])) {
        parsed[role.key] = DEFAULT_PERMISSION_MATRIX[role.key] || ['/'];
      }
    }

    // Ensure ADMIN always has all screens
    parsed.ADMIN = SYSTEM_SCREENS.map(s => s.path);
    return parsed;
  } catch (e) {
    console.error('Error loading stored permission matrix:', e);
    return DEFAULT_PERMISSION_MATRIX;
  }
}

/**
 * Save permission matrix to localStorage
 */
export function saveStoredMatrix(matrix) {
  if (typeof window === 'undefined') return;
  const updated = {
    ...matrix,
    ADMIN: SYSTEM_SCREENS.map(s => s.path) // Safety guarantee
  };
  localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(updated));
  setTimeout(() => {
    window.dispatchEvent(new Event('permission-matrix-updated'));
  }, 0);
}

/**
 * Check if a role can manage Company Profile & Branding (/settings)
 */
export function canManageCompany(role) {
  if (!role) return false;
  const upperRole = String(role).trim().toUpperCase();
  if (upperRole === 'ADMIN') return true;
  const matrix = getStoredMatrix();
  const allowed = matrix[upperRole] || [];
  return allowed.includes('/settings');
}

/**
 * Check if a role can export / import / restore the database
 */
export function canManageDatabase(role) {
  if (!role) return false;
  const upperRole = String(role).trim().toUpperCase();
  if (upperRole === 'ADMIN') return true;
  const matrix = getStoredMatrix();
  const allowed = matrix[upperRole] || [];
  return allowed.includes('/settings/database');
}

/**
 * Check if a role can configure online MySQL server & live sync
 */
export function canManageServer(role) {
  if (!role) return false;
  const upperRole = String(role).trim().toUpperCase();
  if (upperRole === 'ADMIN') return true;
  const matrix = getStoredMatrix();
  const allowed = matrix[upperRole] || [];
  return allowed.includes('/settings/server');
}

/**
 * Check if a role can access a specific route path
 */
export function canAccessScreen(role, path) {
  if (!role) return false;
  const upperRole = String(role).trim().toUpperCase();

  // Master Admin can access everything
  if (upperRole === 'ADMIN') return true;

  const cleanPath = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';
  
  // Specific Sub-Module Authorizations
  if (cleanPath === '/settings/database') {
    return canManageDatabase(upperRole);
  }
  if (cleanPath === '/settings/server') {
    return canManageServer(upperRole);
  }
  if (cleanPath === '/settings') {
    return canManageCompany(upperRole) || canManageServer(upperRole) || canManageDatabase(upperRole);
  }

  const matrix = getStoredMatrix();
  const allowedPaths = matrix[upperRole] || [];

  return allowedPaths.some(p => {
    const cleanAllowed = (p || '/').split('?')[0].replace(/\/+$/, '') || '/';
    // If permission is /settings, do not cascade into restricted settings sub-modules unless specifically granted
    if (cleanAllowed === '/settings' && ['/settings/database', '/settings/server'].includes(cleanPath)) {
      return false;
    }
    return cleanPath === cleanAllowed || cleanPath.startsWith(cleanAllowed + '/');
  });
}

/**
 * Add a new role manually
 */
export function addCustomRole(key, nameAr, nameEn, allowedPaths = ['/']) {
  const cleanKey = String(key || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!cleanKey) return { success: false, message: 'invalid_key' };

  const currentRoles = getStoredRoles();
  if (currentRoles.some(r => r.key === cleanKey)) {
    return { success: false, message: 'role_exists' };
  }

  const newRole = {
    key: cleanKey,
    nameAr: nameAr || cleanKey,
    nameEn: nameEn || cleanKey,
    isSystem: false,
    badgeColor: '#6366F1'
  };

  const updatedRoles = [...currentRoles, newRole];
  saveStoredRoles(updatedRoles);

  const currentMatrix = getStoredMatrix();
  currentMatrix[cleanKey] = Array.isArray(allowedPaths) ? allowedPaths : ['/'];
  saveStoredMatrix(currentMatrix);

  return { success: true, role: newRole };
}

/**
 * Delete a custom role
 */
export function deleteCustomRole(key) {
  const cleanKey = String(key || '').trim().toUpperCase();
  if (cleanKey === 'ADMIN') return { success: false, message: 'cannot_delete_admin' };

  const currentRoles = getStoredRoles();
  const roleToDelete = currentRoles.find(r => r.key === cleanKey);
  if (roleToDelete?.isSystem) {
    return { success: false, message: 'cannot_delete_system_role' };
  }

  const updatedRoles = currentRoles.filter(r => r.key !== cleanKey);
  saveStoredRoles(updatedRoles);

  const currentMatrix = getStoredMatrix();
  delete currentMatrix[cleanKey];
  saveStoredMatrix(currentMatrix);

  return { success: true };
}

/**
 * Add a new custom department
 */
export function addCustomDepartment(key, nameAr, nameEn, defaultRole = 'ACCOUNTANT') {
  const cleanKey = String(key || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!cleanKey) return { success: false, message: 'invalid_key' };

  const currentDepts = getStoredDepartments();
  if (currentDepts.some(d => d.key === cleanKey)) {
    return { success: false, message: 'department_exists' };
  }

  const newDept = {
    key: cleanKey,
    nameAr: nameAr || cleanKey,
    nameEn: nameEn || cleanKey,
    defaultRole: defaultRole || 'ACCOUNTANT'
  };

  const updated = [...currentDepts, newDept];
  saveStoredDepartments(updated);
  return { success: true, department: newDept };
}

/**
 * Delete a custom department
 */
export function deleteCustomDepartment(key) {
  const cleanKey = String(key || '').trim().toUpperCase();
  const currentDepts = getStoredDepartments();
  const updated = currentDepts.filter(d => d.key !== cleanKey);
  saveStoredDepartments(updated);
  return { success: true };
}

/**
 * Reset all permissions, roles, and departments to factory defaults
 */
export function resetPermissionsToDefault() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLES_STORAGE_KEY);
  localStorage.removeItem(MATRIX_STORAGE_KEY);
  localStorage.removeItem(DEPARTMENTS_STORAGE_KEY);
  setTimeout(() => {
    window.dispatchEvent(new Event('permission-matrix-updated'));
  }, 0);
}
