"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function Attendance() {
  const { t } = useTranslation();

  const schema = [
    { key: 'work_date', label: 'work_date', type: 'date', required: true },
    { key: 'employee_id', label: 'full_name', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'check_in_time', label: 'check_in', type: 'time' },
    { key: 'check_out_time', label: 'check_out', type: 'time' },
    { key: 'status', label: 'status', type: 'select', options: ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'], required: true }
  ];

  return <DynamicCRUD tableName="attendance" title={t('attendance')} schema={schema} />;
}
