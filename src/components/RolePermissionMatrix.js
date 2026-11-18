"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  SYSTEM_SCREENS, 
  getStoredRoles, 
  getStoredMatrix, 
  saveStoredMatrix, 
  addCustomRole, 
  deleteCustomRole, 
  resetPermissionsToDefault,
  getStoredDepartments,
  saveStoredDepartments,
  addCustomDepartment,
  deleteCustomDepartment
} from '../utils/permissionMatrix';
import { 
  Shield, Check, Plus, Trash2, RotateCcw, Search, CheckSquare, 
  Square, Lock, Info, X, ShieldAlert, Sparkles, Sliders,
  Building, Users as UsersIcon, UserCheck, ArrowRight, Save
} from 'lucide-react';
import { useDialog } from './DialogProvider';
import { db } from '../db';

export default function RolePermissionMatrix() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dialog = useDialog();

  // Sub-tabs: 'screens' | 'departments' | 'assignments'
  const [subTab, setSubTab] = useState('screens');

  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  const [screenSearch, setScreenSearch] = useState('');
  const [assignSearch, setAssignSearch] = useState('');

  // Add Role Modal
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleNameAr, setNewRoleNameAr] = useState('');
  const [newRoleNameEn, setNewRoleNameEn] = useState('');
  const [copyFromRole, setCopyFromRole] = useState('ACCOUNTANT');

  // Add Department Modal
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptKey, setNewDeptKey] = useState('');
  const [newDeptNameAr, setNewDeptNameAr] = useState('');
  const [newDeptNameEn, setNewDeptNameEn] = useState('');
  const [newDeptDefaultRole, setNewDeptDefaultRole] = useState('ACCOUNTANT');

  const loadData = async () => {
    setRoles(getStoredRoles());
    setDepartments(getStoredDepartments());
    setMatrix(getStoredMatrix());

    try {
      const dbUsers = await db.users.filter(u => !u.deleted_at).toArray();
      const dbEmps = await db.employees.filter(e => !e.deleted_at).toArray();
      setUsersList(dbUsers);
      setEmployeesList(dbEmps);
    } catch (e) {
      console.error('Error loading DB users & employees:', e);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('permission-matrix-updated', handleUpdate);
    return () => window.removeEventListener('permission-matrix-updated', handleUpdate);
  }, []);

  const handleToggleScreen = (roleKey, path) => {
    if (roleKey === 'ADMIN') return; // Admin always retains all access

    const current = matrix[roleKey] || [];
    const isAllowed = current.includes(path);
    const nextAllowed = isAllowed 
      ? current.filter(p => p !== path) 
      : [...current, path];

    const updated = { ...matrix, [roleKey]: nextAllowed };
    setMatrix(updated);
    saveStoredMatrix(updated);
  };

  const handleSelectAllForRole = (roleKey) => {
    if (roleKey === 'ADMIN') return;
    const updated = {
      ...matrix,
      [roleKey]: SYSTEM_SCREENS.map(s => s.path)
    };
    setMatrix(updated);
    saveStoredMatrix(updated);
  };

  const handleClearAllForRole = (roleKey) => {
    if (roleKey === 'ADMIN') return;
    const updated = {
      ...matrix,
      [roleKey]: ['/'] // Keep dashboard at least
    };
    setMatrix(updated);
    saveStoredMatrix(updated);
  };

  const handleCreateRole = (e) => {
    e.preventDefault();
    if (!newRoleKey.trim()) return;

    const sourcePaths = matrix[copyFromRole] || ['/'];
    const res = addCustomRole(newRoleKey, newRoleNameAr, newRoleNameEn, sourcePaths);

    if (!res.success) {
      if (res.message === 'role_exists') {
        dialog.alert({
          variant: 'error',
          title: isRTL ? 'خطأ' : 'Error',
          message: isRTL ? 'هذا الدور موجود مسبقاً.' : 'This role already exists.'
        });
      } else {
        dialog.alert({
          variant: 'error',
          title: isRTL ? 'خطأ' : 'Error',
          message: isRTL ? 'يرجى كتابة رمز دور صحيح باللغة الإنجليزية.' : 'Invalid role key.'
        });
      }
      return;
    }

    dialog.alert({
      variant: 'success',
      title: isRTL ? 'تم إنشاء الدور بنجاح' : 'Role Created',
      message: isRTL 
        ? `تمت إضافة الدور الجديد (${newRoleKey}) بنجاح إلى مصفوفة الصلاحيات وقائمة المستخدمين.` 
        : `Role (${newRoleKey}) has been created successfully.`
    });

    setNewRoleKey('');
    setNewRoleNameAr('');
    setNewRoleNameEn('');
    setIsAddRoleOpen(false);
    loadData();
  };

  const handleDeleteRole = async (roleKey) => {
    const ok = await dialog.confirm({
      variant: 'danger',
      title: isRTL ? 'حذف الدور' : 'Delete Role',
      message: isRTL 
        ? `هل أنت متأكد من حذف الدور (${roleKey})؟ سيتم إلغاء صلاحياته من النظام.` 
        : `Are you sure you want to delete role (${roleKey})?`
    });

    if (!ok) return;

    const res = deleteCustomRole(roleKey);
    if (res.success) {
      loadData();
    } else {
      dialog.alert({
        variant: 'error',
        message: isRTL ? 'لا يمكن حذف الأدوار الأساسية للنظام.' : 'System roles cannot be deleted.'
      });
    }
  };

  const handleCreateDept = (e) => {
    e.preventDefault();
    if (!newDeptKey.trim()) return;

    const res = addCustomDepartment(newDeptKey, newDeptNameAr, newDeptNameEn, newDeptDefaultRole);
    if (!res.success) {
      dialog.alert({
        variant: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        message: isRTL ? 'هذا القسم مسجل بالفعل.' : 'Department key already exists.'
      });
      return;
    }

    dialog.alert({
      variant: 'success',
      title: isRTL ? 'تم إضافة القسم بنجاح' : 'Department Created',
      message: isRTL ? `تمت إضافة القسم (${newDeptKey}) بنجاح.` : `Department (${newDeptKey}) created.`
    });

    setNewDeptKey('');
    setNewDeptNameAr('');
    setNewDeptNameEn('');
    setIsAddDeptOpen(false);
    loadData();
  };

  const handleDeleteDept = async (deptKey) => {
    const ok = await dialog.confirm({
      variant: 'danger',
      title: isRTL ? 'حذف القسم' : 'Delete Department',
      message: isRTL ? `هل تريد حذف القسم (${deptKey})؟` : `Delete department (${deptKey})?`
    });

    if (ok) {
      deleteCustomDepartment(deptKey);
      loadData();
    }
  };

  const handleUpdateDeptDefaultRole = (deptKey, newRole) => {
    const updated = departments.map(d => d.key === deptKey ? { ...d, defaultRole: newRole } : d);
    setDepartments(updated);
    saveStoredDepartments(updated);
  };

  const handleUpdateUserAssignment = async (userId, newFields) => {
    try {
      const user = await db.users.get(userId);
      if (!user) return;
      if ((user.id === 'usr-001-admin' || String(user.username || '').toLowerCase() === 'admin') && newFields.role && newFields.role !== 'ADMIN') {
        return;
      }
      const updated = { ...user, ...newFields, updated_at: new Date().toISOString(), sync_status: 'PENDING' };
      await db.users.put(updated);
      setUsersList(prev => prev.map(u => u.id === userId ? updated : u));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('permission-matrix-updated'));
      }
    } catch (e) {
      console.error('Failed to update user assignment:', e);
    }
  };

  const handleUpdateEmployeeDepartment = async (empId, newDept) => {
    try {
      const emp = await db.employees.get(empId);
      if (!emp) return;
      const updated = { ...emp, department: newDept, updated_at: new Date().toISOString() };
      await db.employees.put(updated);
      setEmployeesList(prev => prev.map(e => e.id === empId ? updated : e));
    } catch (e) {
      console.error('Failed to update employee department:', e);
    }
  };

  const handleResetDefaults = async () => {
    const ok = await dialog.confirm({
      variant: 'danger',
      title: isRTL ? 'إعادة ضبط المصفوفة' : 'Reset Permission Matrix',
      message: isRTL 
        ? 'هل تريد استعادة مصفوفة الصلاحيات والأدوار والأقسام إلى الإعدادات الافتراضية المصنعية؟' 
        : 'Do you want to reset all permissions, roles, and departments to factory defaults?'
    });

    if (ok) {
      resetPermissionsToDefault();
      loadData();
      dialog.alert({
        variant: 'success',
        message: isRTL ? 'تمت استعادة الصلاحيات والأدوار الافتراضية بنجاح.' : 'Permissions reset to defaults.'
      });
    }
  };

  // Group and filter screens
  const filteredScreens = SYSTEM_SCREENS.filter(s => {
    if (!screenSearch.trim()) return true;
    const q = screenSearch.toLowerCase();
    return s.labelAr.toLowerCase().includes(q) || s.labelEn.toLowerCase().includes(q) || s.path.toLowerCase().includes(q);
  });

  const getGroupName = (group) => {
    const names = {
      overview: isRTL ? 'نظرة عامة، التقارير، والملفات الشاملة (بروفايل)' : 'Overview, Reports & Entity Profiles',
      sales: isRTL ? 'المبيعات والعملاء وعروض الأسعار' : 'Sales, Customers & Quotations',
      manufacturing: isRTL ? 'التصنيع، المخازن، والخامات (BOM)' : 'Manufacturing, Warehouse & Inventory (BOM)',
      purchasing: isRTL ? 'المشتريات والموردين وعقود الخامات' : 'Purchasing, Suppliers & Contracts',
      logistics: isRTL ? 'اللوجستيات والشحن والتوصيل' : 'Logistics, Fleet & Shipping',
      finance: isRTL ? 'المالية، المصروفات، وسلف وقروض الموظفين' : 'Finance, Expenses & Employee Loans',
      hr: isRTL ? 'الموارد البشرية وشؤون الموظفين' : 'Human Resources & Workforce',
      admin: isRTL ? 'الإدارة، المستخدمين، والإعدادات الكاملة (Full Settings)' : 'Administration, Security & Full System Settings'
    };
    return names[group] || group;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Header Card */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          border: '1px solid var(--border)'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={22} style={{ color: 'var(--primary)' }} />
            {isRTL ? 'مصفوفة الصلاحيات، الأقسام، وربط الموظفين' : 'Roles, Departments & Employee Assignment'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isRTL 
              ? 'إدارة صلاحيات الشاشات، إنشاء الأدوار، تنظيم الأقسام، وربط الموظفين والمستخدمين بالأدوار الوظيفية فورياً.' 
              : 'Manage screen permissions, define departments, and assign employees & users to roles.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {subTab === 'screens' && (
            <button 
              type="button" 
              onClick={() => setIsAddRoleOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.1rem', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>{isRTL ? 'إضافة دور جديد' : 'Add New Role'}</span>
            </button>
          )}

          {subTab === 'departments' && (
            <button 
              type="button" 
              onClick={() => setIsAddDeptOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.1rem', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>{isRTL ? 'إضافة قسم جديد' : 'Add Department'}</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={handleResetDefaults}
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              padding: '0.6rem 1rem', 
              backgroundColor: 'var(--surface-hover)', 
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              fontWeight: 600
            }}
          >
            <RotateCcw size={15} />
            <span>{isRTL ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setSubTab('screens')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'screens' ? 'var(--primary)' : 'transparent',
            color: subTab === 'screens' ? 'var(--primary-foreground)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Sliders size={16} />
          <span>{isRTL ? 'مصفوفة الشاشات والأدوار' : 'Screen Permission Matrix'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('departments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'departments' ? 'var(--primary)' : 'transparent',
            color: subTab === 'departments' ? 'var(--primary-foreground)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Building size={16} />
          <span>{isRTL ? 'الأقسام وربط الأدوار (Departments)' : 'Departments & Roles'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('assignments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'assignments' ? 'var(--primary)' : 'transparent',
            color: subTab === 'assignments' ? 'var(--primary-foreground)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <UserCheck size={16} />
          <span>{isRTL ? 'ربط الموظفين والمستخدمين بالأدوار' : 'Employee & User Assignment'}</span>
        </button>
      </div>

      {/* TAB 1: SCREEN PERMISSION MATRIX */}
      {subTab === 'screens' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <input
                type="text"
                value={screenSearch}
                onChange={(e) => setScreenSearch(e.target.value)}
                placeholder={isRTL ? 'بحث في الشاشات والأقسام...' : 'Search screens...'}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  paddingInlineStart: '2.4rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <Search 
                size={16} 
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isRTL ? 'right' : 'left']: '0.8rem',
                  color: 'var(--text-muted)'
                }}
              />
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={15} style={{ color: 'var(--primary)' }} />
              <span>
                {isRTL 
                  ? 'تنعكس التغييرات فورياً على شريط التنقل الجانبي وحماية الشاشات لجميع المستخدمين.' 
                  : 'Changes apply immediately to sidebar navigation and screen guards.'}
              </span>
            </div>
          </div>

          <div 
            className="glass-card" 
            style={{ 
              padding: 0, 
              overflow: 'hidden', 
              border: '1px solid var(--border)', 
              borderRadius: '12px' 
            }}
          >
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: isRTL ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border)' }}>
                    <th 
                      style={{ 
                        padding: '1.15rem 1.25rem', 
                        fontSize: '0.875rem', 
                        fontWeight: 800, 
                        color: 'var(--text-main)',
                        minWidth: '240px',
                        borderBottom: '2px solid var(--border)'
                      }}
                    >
                      {isRTL ? 'الشاشة / القسم' : 'Screen / Module'}
                    </th>

                    {roles.map(role => {
                      const allowedCount = (matrix[role.key] || []).length;
                      const totalCount = SYSTEM_SCREENS.length;

                      return (
                        <th 
                          key={role.key}
                          style={{ 
                            padding: '1rem', 
                            textAlign: 'center', 
                            minWidth: '150px',
                            borderBottom: '2px solid var(--border)',
                            borderLeft: isRTL ? '1px solid var(--border)' : 'none',
                            borderRight: isRTL ? 'none' : '1px solid var(--border)',
                            background: role.key === 'ADMIN' ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                {isRTL ? role.nameAr : role.nameEn}
                              </span>
                              {!role.isSystem && role.key !== 'ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(role.key)}
                                  title={isRTL ? 'حذف هذا الدور' : 'Delete Role'}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>

                            <span 
                              style={{ 
                                fontSize: '0.675rem', 
                                padding: '2px 8px', 
                                borderRadius: '999px', 
                                fontWeight: 700,
                                background: role.key === 'ADMIN' ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-hover)',
                                color: role.key === 'ADMIN' ? '#2563EB' : 'var(--text-muted)',
                                border: '1px solid var(--border)'
                              }}
                            >
                              {role.key} ({allowedCount}/{totalCount})
                            </span>

                            {role.key !== 'ADMIN' && (
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllForRole(role.key)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  {isRTL ? 'الكل' : 'All'}
                                </button>
                                <span style={{ color: 'var(--border)' }}>|</span>
                                <button
                                  type="button"
                                  onClick={() => handleClearAllForRole(role.key)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  {isRTL ? 'مسح' : 'Clear'}
                                </button>
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredScreens.map((screen, idx) => {
                    const prevScreen = filteredScreens[idx - 1];
                    const showGroupHeader = !prevScreen || prevScreen.group !== screen.group;

                    return (
                      <React.Fragment key={screen.id}>
                        {showGroupHeader && !screenSearch && (
                          <tr style={{ background: 'var(--surface-hover)' }}>
                            <td 
                              colSpan={roles.length + 1} 
                              style={{ 
                                padding: '0.5rem 1.25rem', 
                                fontSize: '0.75rem', 
                                fontWeight: 800, 
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                borderTop: '1px solid var(--border)',
                                borderBottom: '1px solid var(--border)'
                              }}
                            >
                              {getGroupName(screen.group)}
                            </td>
                          </tr>
                        )}

                        <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                {isRTL ? screen.labelAr : screen.labelEn}
                              </span>
                              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {screen.path}
                              </span>
                            </div>
                          </td>

                          {roles.map(role => {
                            const isAllowed = role.key === 'ADMIN' || (matrix[role.key] || []).includes(screen.path);

                            return (
                              <td 
                                key={role.key}
                                onClick={() => {
                                  if (role.key !== 'ADMIN') {
                                    handleToggleScreen(role.key, screen.path);
                                  }
                                }}
                                style={{ 
                                  padding: '0.65rem 0.85rem', 
                                  textAlign: 'center',
                                  cursor: role.key === 'ADMIN' ? 'default' : 'pointer',
                                  userSelect: 'none',
                                  borderLeft: isRTL ? '1px solid var(--border)' : 'none',
                                  borderRight: isRTL ? 'none' : '1px solid var(--border)',
                                  background: role.key === 'ADMIN' 
                                    ? 'rgba(59, 130, 246, 0.03)' 
                                    : isAllowed 
                                      ? 'rgba(16, 185, 129, 0.06)' 
                                      : 'transparent',
                                  transition: 'background-color 0.15s ease'
                                }}
                                title={role.key === 'ADMIN' ? (isRTL ? 'مدير النظام يحتفظ بكامل الصلاحيات تلقائياً' : 'Admin retains full access') : (isAllowed ? (isRTL ? 'مفعل (انقر للإلغاء)' : 'Allowed (click to revoke)') : (isRTL ? 'معطل (انقر للتفعيل)' : 'Denied (click to allow)'))}
                              >
                                {role.key === 'ADMIN' ? (
                                  <div 
                                    style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      borderRadius: '6px', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      background: 'rgba(16, 185, 129, 0.15)', 
                                      color: '#10B981', 
                                      border: '1.5px solid #10B981',
                                      margin: '0 auto'
                                    }} 
                                    title="Full Access / صلاحية كاملة"
                                  >
                                    <Check size={16} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div 
                                    style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      borderRadius: '6px', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      background: isAllowed ? 'var(--primary)' : 'var(--surface)', 
                                      color: '#ffffff', 
                                      border: isAllowed ? '2px solid var(--primary)' : '2px solid var(--border)',
                                      boxShadow: isAllowed ? '0 2px 6px rgba(37,99,235,0.28)' : 'none',
                                      margin: '0 auto',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {isAllowed && <Check size={15} strokeWidth={3} />}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {filteredScreens.length === 0 && (
                    <tr>
                      <td colSpan={roles.length + 1} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {isRTL ? 'لم يتم العثور على شاشات تطابق البحث.' : 'No screens match search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: DEPARTMENTS & ROLE MAPPING */}
      {subTab === 'departments' && (
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
              {isRTL ? 'هيكل الأقسام والأدوار الافتراضية' : 'Departments & Default Assigned Roles'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {isRTL 
                ? 'حدد الدور الافتراضي لكل قسم إداري في المصنع لتسهيل تعيين صلاحيات الموظفين الجدد.' 
                : 'Define default roles for factory departments to streamline employee onboarding.'}
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'القسم' : 'Department'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'الرمز' : 'Code'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'الدور الوظيفي المرتبط' : 'Assigned Role'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'عدد الموظفين' : 'Employees Count'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>{isRTL ? 'إجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => {
                  const empCount = employeesList.filter(e => e.department === dept.key).length;

                  return (
                    <tr key={dept.key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {isRTL ? dept.nameAr : dept.nameEn}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {dept.key}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={dept.defaultRole || 'ACCOUNTANT'}
                          onChange={(e) => handleUpdateDeptDefaultRole(dept.key, e.target.value)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface-hover)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          {roles.map(r => (
                            <option key={r.key} value={r.key}>
                              {r.key} - {isRTL ? r.nameAr : r.nameEn}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--surface-hover)', fontSize: '0.8rem', fontWeight: 700 }}>
                          {empCount} {isRTL ? 'موظف' : 'employees'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteDept(dept.key)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title={isRTL ? 'حذف القسم' : 'Delete Department'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEE & USER ASSIGNMENTS */}
      {subTab === 'assignments' && (
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
                {isRTL ? 'جدول تخصيص صلاحيات المستخدمين والموظفين' : 'Employee & User Role Assignment'}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {isRTL 
                  ? 'عيّن لكل مستخدم في النظام الموظف التابع له، القسم الإداري، ودوره في مصفوفة الصلاحيات مباشرة.' 
                  : 'Assign linked employee, department, and role to each system user.'}
              </p>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder={isRTL ? 'بحث في المستخدمين أو الموظفين...' : 'Search users/employees...'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.85rem',
                  paddingInlineStart: '2.2rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
              <Search size={15} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: '0.65rem', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'اسم المستخدم' : 'Username'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'الموظف المرتبط' : 'Linked Employee'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'القسم / الإدارة' : 'Department'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'الدور في مصفوفة الصلاحيات' : 'Role in Matrix'}</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{isRTL ? 'الشاشات المصرح بها' : 'Accessible Screens'}</th>
                </tr>
              </thead>
              <tbody>
                {usersList
                  .filter(u => {
                    if (!assignSearch.trim()) return true;
                    const q = assignSearch.toLowerCase();
                    const emp = employeesList.find(e => e.id === u.employee_id);
                    return (u.username || '').toLowerCase().includes(q) || (emp?.full_name || '').toLowerCase().includes(q);
                  })
                  .map(user => {
                    const linkedEmp = employeesList.find(e => e.id === user.employee_id);
                    const userRole = user.role || 'ACCOUNTANT';
                    const allowedCount = userRole === 'ADMIN' ? SYSTEM_SCREENS.length : (matrix[userRole] || []).length;

                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span>{user.username}</span>
                          </div>
                        </td>

                        {/* Linked Employee selector */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={user.employee_id || ''}
                            onChange={(e) => {
                              const empId = e.target.value;
                              const emp = employeesList.find(item => item.id === empId);
                              const newDept = emp?.department;
                              const matchedDept = departments.find(d => d.key === newDept);
                              const defaultRole = matchedDept?.defaultRole;

                              handleUpdateUserAssignment(user.id, { 
                                employee_id: empId,
                                ...(defaultRole && user.username !== 'admin' ? { role: defaultRole } : {})
                              });
                            }}
                            style={{
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface-hover)',
                              color: 'var(--text-main)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <option value="">{isRTL ? '-- غير مرتبط بموظف --' : '-- No linked employee --'}</option>
                            {employeesList.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.full_name} {emp.job_title ? `(${emp.job_title})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Department selector */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={linkedEmp?.department || ''}
                            disabled={!linkedEmp}
                            onChange={(e) => {
                              if (!linkedEmp) return;
                              const newDeptKey = e.target.value;
                              handleUpdateEmployeeDepartment(linkedEmp.id, newDeptKey);
                              const matchedDept = departments.find(d => d.key === newDeptKey);
                              if (matchedDept?.defaultRole && user.username !== 'admin') {
                                handleUpdateUserAssignment(user.id, { role: matchedDept.defaultRole });
                              }
                            }}
                            style={{
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface-hover)',
                              color: 'var(--text-main)',
                              fontSize: '0.85rem',
                              opacity: linkedEmp ? 1 : 0.5
                            }}
                          >
                            <option value="">{isRTL ? '-- اختر القسم --' : '-- Select Department --'}</option>
                            {departments.map(d => (
                              <option key={d.key} value={d.key}>
                                {isRTL ? d.nameAr : d.nameEn}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Role selector */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={user.role || 'ACCOUNTANT'}
                            disabled={user.username === 'admin'}
                            onChange={(e) => handleUpdateUserAssignment(user.id, { role: e.target.value })}
                            style={{
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface-hover)',
                              color: 'var(--text-main)',
                              fontSize: '0.85rem',
                              fontWeight: 700
                            }}
                          >
                            {roles.map(r => (
                              <option key={r.key} value={r.key}>
                                {r.key} - {isRTL ? r.nameAr : r.nameEn}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Permissions badge count */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ 
                            padding: '3px 9px', 
                            borderRadius: '999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            background: userRole === 'ADMIN' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: userRole === 'ADMIN' ? '#2563EB' : '#059669',
                            border: '1px solid var(--border)'
                          }}>
                            {allowedCount} / {SYSTEM_SCREENS.length} {isRTL ? 'شاشة' : 'screens'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add New Role Modal */}
      {isAddRoleOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsAddRoleOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
              animation: 'dialog-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {isRTL ? 'إضافة دور وظيفي جديد' : 'Add New Custom Role'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddRoleOpen(false)} 
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRole}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'رمز الدور بالإنجليزية (Unique Key)' : 'Role Code / Key'} *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. QUALITY_INSPECTOR"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'الاسم بالعربية' : 'Arabic Name'}
                </label>
                <input
                  type="text"
                  value={newRoleNameAr}
                  onChange={(e) => setNewRoleNameAr(e.target.value)}
                  placeholder={isRTL ? 'مثال: فاحص جودة' : 'Arabic Name'}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'الاسم بالإنجليزية' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={newRoleNameEn}
                  onChange={(e) => setNewRoleNameEn(e.target.value)}
                  placeholder="e.g. Quality Inspector"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'نسخ الصلاحيات الأولية من دور آخر:' : 'Copy Initial Permissions From:'}
                </label>
                <select
                  value={copyFromRole}
                  onChange={(e) => setCopyFromRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                >
                  {roles.map(r => (
                    <option key={r.key} value={r.key}>
                      {r.key} - {isRTL ? r.nameAr : r.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsAddRoleOpen(false)}
                  className="btn"
                  style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)' }}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 700, padding: '0.65rem 1.4rem' }}
                >
                  {isRTL ? 'حفظ وإنشاء الدور' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Department Modal */}
      {isAddDeptOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsAddDeptOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
              animation: 'dialog-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {isRTL ? 'إضافة قسم إداري جديد' : 'Add New Department'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddDeptOpen(false)} 
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDept}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'رمز القسم بالإنجليزية (Unique Key)' : 'Department Code / Key'} *
                </label>
                <input
                  type="text"
                  required
                  value={newDeptKey}
                  onChange={(e) => setNewDeptKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. QUALITY"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'اسم القسم بالعربية' : 'Arabic Name'}
                </label>
                <input
                  type="text"
                  value={newDeptNameAr}
                  onChange={(e) => setNewDeptNameAr(e.target.value)}
                  placeholder={isRTL ? 'مثال: قسم مراقبة الجودة' : 'Arabic Name'}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'اسم القسم بالإنجليزية' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={newDeptNameEn}
                  onChange={(e) => setNewDeptNameEn(e.target.value)}
                  placeholder="e.g. Quality Control"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {isRTL ? 'الدور الوظيفي الافتراضي للقسم:' : 'Default Assigned Role:'}
                </label>
                <select
                  value={newDeptDefaultRole}
                  onChange={(e) => setNewDeptDefaultRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                >
                  {roles.map(r => (
                    <option key={r.key} value={r.key}>
                      {r.key} - {isRTL ? r.nameAr : r.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="btn"
                  style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)' }}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 700, padding: '0.65rem 1.4rem' }}
                >
                  {isRTL ? 'حفظ وإنشاء القسم' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
