"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';
import { getStoredDepartments, DEFAULT_DEPARTMENTS } from '../../utils/permissionMatrix';

export default function Employees() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [departments, setDepartments] = useState(() => (typeof window !== 'undefined' ? getStoredDepartments() : []));

  useEffect(() => {
    const handleUpdate = () => setDepartments(getStoredDepartments());
    window.addEventListener('permission-matrix-updated', handleUpdate);
    return () => window.removeEventListener('permission-matrix-updated', handleUpdate);
  }, []);

  const departmentList = departments.length > 0 ? departments : DEFAULT_DEPARTMENTS;
  const departmentOptions = departmentList.map(d => ({
    key: typeof d === 'string' ? d : d.key,
    value: typeof d === 'string' ? d : d.key,
    label: typeof d === 'string'
      ? (isRTL ? (DEFAULT_DEPARTMENTS.find(def => def.key === d)?.nameAr || t(d.toLowerCase()) || d) : (DEFAULT_DEPARTMENTS.find(def => def.key === d)?.nameEn || t(d.toLowerCase()) || d))
      : (isRTL ? (d.nameAr || t(d.key.toLowerCase()) || d.key) : (d.nameEn || t(d.key.toLowerCase()) || d.key)),
    nameAr: typeof d === 'object' ? d.nameAr : undefined,
    nameEn: typeof d === 'object' ? d.nameEn : undefined
  }));

  const schema = [
    { key: 'full_name', label: 'full_name', type: 'text', required: true },
    { key: 'department', label: 'department', type: 'select', options: departmentOptions, required: true },
    { key: 'job_title', label: 'job_title', type: 'text' },
    { key: 'mobile_number', label: 'mobile', type: 'text' },
    { key: 'salary_type', label: 'salary_type', type: 'select', options: ['PER_PIECE', 'DAILY', 'WEEKLY', 'MONTHLY'], required: true },
    { key: 'salary_amount', label: 'salary', type: 'number', required: true, isCurrency: true, showTotal: true },
    { key: 'shift_start_time', label: 'shift_start', type: 'time', default: '08:00' },
    { key: 'shift_end_time', label: 'shift_end', type: 'time', default: '17:00' },
    { key: 'is_active', label: 'status', type: 'checkbox', default: 1 }
  ];

  return (
    <DynamicCRUD 
      tableName="employees" 
      title={t('employees')} 
      schema={schema}
    />
  );
}

