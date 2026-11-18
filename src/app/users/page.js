"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon, ShieldCheck } from 'lucide-react';
import DynamicCRUD from '../../components/DynamicCRUD';
import RolePermissionMatrix from '../../components/RolePermissionMatrix';
import { getStoredRoles } from '../../utils/permissionMatrix';

export default function Users() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'matrix') return 'matrix';
    }
    return 'users';
  });
  const [roleOptions, setRoleOptions] = useState(['ADMIN', 'ACCOUNTANT', 'SUPERVISOR']);

  const loadRoleOptions = () => {
    const roles = getStoredRoles();
    setRoleOptions(roles.map(r => r.key));
  };

  useEffect(() => {
    loadRoleOptions();
    const handleUpdate = () => loadRoleOptions();
    window.addEventListener('permission-matrix-updated', handleUpdate);
    return () => window.removeEventListener('permission-matrix-updated', handleUpdate);
  }, []);

  const schema = [
    { key: 'username', label: 'username', type: 'text', required: true },
    { key: 'password_hash', label: 'password', type: 'password', required: true, hideInTable: true }, // Mapped to password field
    { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' },
    { key: 'role', label: 'role', type: 'select', options: roleOptions, required: true },
    { key: 'pin_code', label: 'pin_code', type: 'text' },
    { key: 'is_active', label: 'is_active', type: 'checkbox' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Tab Switcher */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          borderBottom: '1px solid var(--border)', 
          paddingBottom: '0.75rem',
          alignItems: 'center' 
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            fontWeight: 700,
            borderRadius: '10px',
            backgroundColor: activeTab === 'users' ? 'var(--primary)' : 'var(--surface-hover)',
            color: activeTab === 'users' ? 'var(--primary-foreground)' : 'var(--text-main)',
            border: activeTab === 'users' ? '1px solid var(--primary)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <UsersIcon size={18} />
          <span>{isRTL ? 'قائمة المستخدمين والحسابات' : 'Users Management'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`btn ${activeTab === 'matrix' ? 'btn-primary' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            fontWeight: 700,
            borderRadius: '10px',
            backgroundColor: activeTab === 'matrix' ? 'var(--primary)' : 'var(--surface-hover)',
            color: activeTab === 'matrix' ? 'var(--primary-foreground)' : 'var(--text-main)',
            border: activeTab === 'matrix' ? '1px solid var(--primary)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck size={18} />
          <span>{isRTL ? 'مصفوفة صلاحيات الشاشات والأدوار' : 'Permission Matrix & Roles'}</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'users' ? (
        <DynamicCRUD 
          tableName="users" 
          title={t('users')} 
          schema={schema} 
        />
      ) : (
        <RolePermissionMatrix />
      )}
    </div>
  );
}

