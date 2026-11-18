"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../db';
import { 
  Database, Download, Upload, Cloud, HardDrive, RefreshCw, 
  Trash2, Globe, Server, PlugZap, Save, CheckCircle2, AlertCircle,
  Building2, Image, Phone, Mail, Landmark, UploadCloud,
  Lock, ShieldAlert, ShieldCheck, Sliders, Check
} from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';
import { getCompanyProfile, saveCompanyProfile } from '../../utils/companyProfile';
import { useAuth } from '../../context/AuthContext';
import { canManageCompany, canManageDatabase, canManageServer } from '../../utils/permissionMatrix';
import { clearAppCache } from '../../utils/cacheManager';
import { getApiHeaders } from '../../utils/apiClient';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const { user } = useAuth();
  const [, setMatrixRev] = useState(0);

  useEffect(() => {
    const onMatrixChange = () => setMatrixRev(r => r + 1);
    window.addEventListener('permission-matrix-updated', onMatrixChange);
    return () => window.removeEventListener('permission-matrix-updated', onMatrixChange);
  }, []);
  
  const canCompany = canManageCompany(user?.role);
  const canServer = canManageServer(user?.role);
  const canDatabase = canManageDatabase(user?.role);
  const hasDbPermission = canDatabase;
  const dialog = useDialog();

  // Active Sub-Tab: 'company' | 'server' | 'database'
  const [activeTab, setActiveTab] = useState(() => {
    if (canCompany) return 'company';
    if (canServer) return 'server';
    if (canDatabase) return 'database';
    return 'company';
  });

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const offlineFileRef = useRef(null);
  const onlineFileRef = useRef(null);

  // Online Server Configuration State
  const [serverHost, setServerHost] = useState('localhost');
  const [serverPort, setServerPort] = useState(3306);
  const [serverDb, setServerDb] = useState('packerp');
  const [serverUser, setServerUser] = useState('root');
  const [serverPass, setServerPass] = useState('');
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [isRequeuing, setIsRequeuing] = useState(false);

  // Marks every local record as PENDING so the next sync pushes the full dataset
  // (needed when records were previously flagged SYNCED by an old offline sync).
  const handleRequeueAll = async () => {
    if (!hasDbPermission) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: هذه العملية تتطلب صلاحيات مدير النظام.' : 'Access Denied: administrator permissions required.'
      });
      return;
    }
    const ok = await dialog.confirm({
      title: isRTL ? 'إعادة رفع كل البيانات' : 'Re-upload all data',
      message: isRTL
        ? 'سيتم وضع كل السجلات المحلية في قائمة الرفع من جديد، وبعدها تضغط «مزامنة». متأكد؟'
        : 'Every local record will be queued for upload again; then press Sync. Continue?',
      confirmText: isRTL ? 'نعم، أعد الرفع' : 'Yes, re-queue'
    });
    if (!ok) return;

    setIsRequeuing(true);
    let total = 0;
    try {
      for (const table of db.tables) {
        const rows = await table.toArray();
        for (const row of rows) {
          await table.update(row.id, { sync_status: 'PENDING' });
          total++;
        }
      }
      dialog.alert({
        variant: 'success',
        message: isRTL
          ? `تم تجهيز ${total} سجل للرفع. اضغط زر «مزامنة» أعلى الصفحة الآن.`
          : `${total} records queued for upload. Now press the Sync button.`
      });
    } catch (err) {
      dialog.alert({ variant: 'error', message: err?.message || 'فشل تجهيز السجلات' });
    } finally {
      setIsRequeuing(false);
    }
  };

  const handleTestServer = async () => {
    if (!canServer) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: إدارة واختبار إعدادات السيرفر تتطلب صلاحية السيرفر في مصفوفة الصلاحيات.' : 'Access Denied: Server configuration requires server privileges in the permission matrix.'
      });
      return;
    }
    setIsTestingServer(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/save_online_server.php', {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'test',
          host: serverHost,
          port: serverPort,
          database: serverDb,
          user: serverUser,
          password: serverPass
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const dbMissing = data.server?.database_exists === false;
        const suffix = dbMissing
          ? (isRTL
              ? ' — لكن قاعدة البيانات غير موجودة، وستُنشأ عند الحفظ'
              : ' — database does not exist yet; it will be created on save')
          : '';
        setTestStatus({
          success: true,
          serverVersion: data.server?.mysql_version || '',
          message: `${data.message}${suffix} (MySQL ${data.server?.mysql_version || 'Active'})`
        });
      } else {
        setTestStatus({ success: false, message: data.message || 'فشل الاتصال بالسيرفر' });
      }
    } catch (err) {
      setTestStatus({ success: false, message: err.message || 'تعذر الاتصال بالخادم' });
    } finally {
      setIsTestingServer(false);
    }
  };

  // Company Profile & Identity State
  const [companyForm, setCompanyForm] = useState(() => getCompanyProfile());
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      dialog.alert({
        variant: 'error',
        title: isRTL ? 'حجم الصورة كبير' : 'File Too Large',
        message: isRTL ? 'الحد الأقصى لحجم صورة الشعار هو 2 ميجابايت.' : 'Maximum logo file size is 2MB.'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCompanyForm(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = (e) => {
    e.preventDefault();
    if (!canCompany) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: حفظ وتعديل بيانات المنشأة يتطلب صلاحية إعدادات الشركة في مصفوفة الصلاحيات.' : 'Access Denied: Modifying company profile requires company settings permission.'
      });
      return;
    }
    setIsSavingCompany(true);
    try {
      saveCompanyProfile(companyForm);
      dialog.alert({
        variant: 'success',
        title: isRTL ? 'تم حفظ بيانات الشركة' : 'Company Profile Saved',
        message: isRTL 
          ? 'تم تحديث بيانات وشعار وهوية المصنع بنجاح، وستنعكس تلقائياً في شاشات النظام وفواتير وعروض الأسعار والتقارير المطبوعة.' 
          : 'Company name, logo, and identity updated successfully. All screens, invoices, and reports will now reflect these changes.'
      });
    } catch (err) {
      dialog.alert({ variant: 'error', message: err.message || 'Failed to save company profile' });
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveServer = async (e) => {
    e.preventDefault();
    if (!canServer) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: حفظ وتعديل إعدادات السيرفر تتطلب صلاحية السيرفر في مصفوفة الصلاحيات.' : 'Access Denied: Saving server credentials requires server privileges in the permission matrix.'
      });
      return;
    }
    setIsTestingServer(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/save_online_server.php', {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'save',
          host: serverHost,
          port: serverPort,
          database: serverDb,
          user: serverUser,
          password: serverPass
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setTestStatus({ success: true, message: data.message });
        dialog.alert({
          variant: 'success',
          title: isRTL ? 'تم حفظ إعدادات السيرفر' : 'Server Connected',
          message: isRTL 
            ? 'تم حفظ بيانات السيرفر الأونلاين بنجاح واختبار الاتصال به. ستتم المزامنة تلقائياً مع هذا الخادم.'
            : 'Online server credentials saved successfully and verified.'
        });
      } else {
        setTestStatus({ success: false, message: data.message || 'فشل حفظ الإعدادات' });
        dialog.alert({
          variant: 'error',
          title: isRTL ? 'خطأ في الاتصال' : 'Connection Error',
          message: data.message || 'فشل الاتصال بالسيرفر'
        });
      }
    } catch (err) {
      setTestStatus({ success: false, message: err.message || 'خطأ أثناء الحفظ' });
    } finally {
      setIsTestingServer(false);
    }
  };

  // === OFFLINE BACKUP (IndexedDB) ===
  const buildLocalBackupPayload = async () => {
    const counts = {};
    const tableData = {};
    for (const table of db.tables) {
      const rows = await table.toArray();
      tableData[table.name] = rows;
      counts[table.name] = rows.length;
    }

    const safeParse = (raw) => {
      if (raw === null || raw === undefined) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    };

    return {
      _meta: {
        app: 'ultrapack',
        schemaVersion: 1,
        exported_at: new Date().toISOString(),
        counts
      },
      settings: {
        ultrapack_company_profile: safeParse(localStorage.getItem('ultrapack_company_profile')),
        permissionMatrix: safeParse(localStorage.getItem('ultrapack_permission_matrix') ?? localStorage.getItem('permissionMatrix')),
        'ultrapack-lang': localStorage.getItem('ultrapack-lang') || 'ar'
      },
      ...tableData
    };
  };

  const triggerJsonDownload = (payload, filename) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportOfflineDB = async () => {
    if (!hasDbPermission) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: تصدير قاعدة البيانات المحلية يتطلب صلاحيات مدير النظام.' : 'Access Denied: Local database export requires administrator permissions.'
      });
      return;
    }
    try {
      const data = await buildLocalBackupPayload();
      triggerJsonDownload(data, `UltraPack_Offline_Backup_${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Offline Export failed:', error);
      dialog.alert({ variant: 'error', message: t('offline_backup_failed') || 'Failed to export local backup' });
    }
  };

  const importOfflineDB = async (e) => {
    if (!hasDbPermission) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: استيراد واستعادة قاعدة البيانات يتطلب صلاحيات مدير النظام.' : 'Access Denied: Database restore requires administrator permissions.'
      });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    const prevLocalStorage = {
      ultrapack_company_profile: localStorage.getItem('ultrapack_company_profile'),
      ultrapack_permission_matrix: localStorage.getItem('ultrapack_permission_matrix'),
      permissionMatrix: localStorage.getItem('permissionMatrix'),
      'ultrapack-lang': localStorage.getItem('ultrapack-lang')
    };

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(isRTL ? 'الملف المرفوع ليس ملف JSON صالح.' : 'Uploaded file is not valid JSON.');
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(isRTL ? 'بنية ملف النسخة الاحتياطية غير صالحة.' : 'Invalid backup file structure.');
      }

      // 3. Validate _meta.app === "ultrapack"
      if (!data._meta || data._meta.app !== 'ultrapack') {
        throw new Error(
          isRTL
            ? 'ملف غير معتمد: هذا الملف لا ينتمي لنظام Ultra Pack (_meta.app != "ultrapack").'
            : 'Invalid backup file: Missing or mismatched _meta.app ("ultrapack" required).'
        );
      }

      const validTableNames = new Set(db.tables.map((tbl) => tbl.name));
      const tableKeys = Object.keys(data).filter((k) => k !== '_meta' && k !== 'settings');

      if (tableKeys.length === 0) {
        throw new Error(isRTL ? 'الملف لا يحتوي على أي جداول بيانات للاستعادة.' : 'Backup file contains no database tables.');
      }

      let totalRecords = 0;
      for (const tableName of tableKeys) {
        if (!validTableNames.has(tableName)) {
          throw new Error(
            isRTL
              ? `جدول غير معروف داخل الملف: "${tableName}" غير موجود في قاعدة البيانات.`
              : `Unknown table "${tableName}" does not exist in db.tables.`
          );
        }
        const rows = data[tableName];
        if (!Array.isArray(rows)) {
          throw new Error(
            isRTL
              ? `بيانات الجدول "${tableName}" ليست مصفوفة (Array).`
              : `Table "${tableName}" value must be an Array.`
          );
        }
        for (let i = 0; i < rows.length; i++) {
          const rec = rows[i];
          if (
            !rec ||
            typeof rec !== 'object' ||
            Array.isArray(rec) ||
            rec.id === undefined ||
            rec.id === null ||
            String(rec.id).trim() === ''
          ) {
            throw new Error(
              isRTL
                ? `سجل غير صالح في جدول "${tableName}" (عنصر رقم ${i + 1}): يفتقد المعرّف (id).`
                : `Invalid record in table "${tableName}" at index ${i}: missing id.`
            );
          }
        }
        totalRecords += rows.length;
      }

      // 4. Confirmation message before touching anything
      const totalTables = tableKeys.length;
      const confirmed = await dialog.confirm({
        title: isRTL ? 'تأكيد استعادة النسخة الاحتياطية' : 'Confirm Backup Restore',
        message: `هيتم استبدال البيانات الحالية. الملف فيه ${totalRecords} سجل في ${totalTables} جدول. متأكد؟`,
        confirmText: isRTL ? 'نعم، استبدل البيانات' : 'Yes, Restore'
      });
      if (!confirmed) return;

      // 5. Automatic pre-restore backup download BEFORE any clear
      const preRestorePayload = await buildLocalBackupPayload();
      const dateStamp = new Date().toISOString().split('T')[0];
      triggerJsonDownload(preRestorePayload, `pre-restore-${dateStamp}.json`);

      // 6. Execute full restore inside a single atomic rw transaction across all tables
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.clear();
        }
        for (const tableName of tableKeys) {
          if (data[tableName].length > 0) {
            await db[tableName].bulkAdd(data[tableName]);
          }
        }
      });

      // 7. Apply localStorage settings ONLY after transaction succeeds, then reload
      if (data.settings && typeof data.settings === 'object') {
        if (data.settings.ultrapack_company_profile !== undefined && data.settings.ultrapack_company_profile !== null) {
          const val = typeof data.settings.ultrapack_company_profile === 'string'
            ? data.settings.ultrapack_company_profile
            : JSON.stringify(data.settings.ultrapack_company_profile);
          localStorage.setItem('ultrapack_company_profile', val);
        }
        const matrixVal = data.settings.permissionMatrix ?? data.settings.ultrapack_permission_matrix;
        if (matrixVal !== undefined && matrixVal !== null) {
          const serialized = typeof matrixVal === 'string' ? matrixVal : JSON.stringify(matrixVal);
          localStorage.setItem('ultrapack_permission_matrix', serialized);
          localStorage.setItem('permissionMatrix', serialized);
        }
        if (data.settings['ultrapack-lang']) {
          localStorage.setItem('ultrapack-lang', String(data.settings['ultrapack-lang']));
        }
      }

      await dialog.alert({ variant: 'success', message: t('offline_restore_success') || 'Local database restored successfully!' });
      window.location.reload();
    } catch (err) {
      console.error('Restore failed:', err);
      // Restore previous localStorage snapshot in case anything was touched
      Object.entries(prevLocalStorage).forEach(([key, val]) => {
        if (val === null || val === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, val);
        }
      });
      await dialog.alert({
        variant: 'error',
        message: err?.message || t('offline_restore_failed') || 'Failed to restore local database'
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleClearCache = async () => {
    const isDesktop = typeof window !== 'undefined' && !!window.jinnworxDesktop;
    const ok = await dialog.confirm({
      title: isRTL ? 'تفريغ ومسح الذاكرة المؤقتة (Clear Cache)' : 'Clear System Cache & Temporary Data',
      message: isRTL 
        ? `هل تريد مسح وتفريغ الذاكرة المؤقتة بالكامل؟\n\n• تفريغ كاش المتصفح (Web CacheStorage & HTTP Assets).\n${isDesktop ? '• تفريغ كاش جلسة سطح المكتب ومحرك V8 (Electron Session Cache).\n' : ''}• تنظيف الجلسة المؤقتة وإعادة تحديث الواجهة فوراً.\n• ملاحظة هامة: بياناتك المخزنة محلياً وقواعد البيانات (IndexedDB & MySQL) لن تتأثر وستظل محفوظة بأمان.`
        : `Are you sure you want to clear system caches?\n\n• Purge browser CacheStorage and HTTP memory.\n${isDesktop ? '• Purge Electron desktop V8 session caches.\n' : ''}• Flush temporary storage and reload interface.\n• Notice: Offline records in IndexedDB & MySQL are completely preserved.`,
      confirmText: isRTL ? 'مسح الكاش وإعادة التحميل' : 'Clear Cache & Reload'
    });
    if (!ok) return;

    setIsClearingCache(true);
    try {
      await clearAppCache({ reload: true });
    } catch (err) {
      console.error('Clear cache failed:', err);
      dialog.alert({ variant: 'error', message: isRTL ? 'تعذر مسح الذاكرة المؤقتة' : 'Failed to clear cache' });
      setIsClearingCache(false);
    }
  };

  // === ONLINE BACKUP (MySQL) ===
  const exportOnlineDB = async () => {
    if (!hasDbPermission) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: تصدير قاعدة بيانات السيرفر الأونلاين يتطلب صلاحيات مدير النظام.' : 'Access Denied: Cloud database export requires administrator permissions.'
      });
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup.php', {
        headers: getApiHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch online backup");
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from server: " + text.slice(0, 80));
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UltraPack_Online_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error(error);
      dialog.alert({ variant: 'error', message: t('online_backup_failed') || 'Failed to export cloud backup' });
    } finally {
      setIsExporting(false);
    }
  };

  const importOnlineDB = async (e) => {
    if (!hasDbPermission) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: استيراد واستعادة قاعدة بيانات السيرفر الأونلاين يتطلب صلاحيات مدير النظام.' : 'Access Denied: Cloud database restore requires administrator permissions.'
      });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/sync.php', {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Server rejected import");
      const resText = await res.text();
      let result;
      try {
        result = JSON.parse(resText);
      } catch {
        throw new Error(resText.slice(0, 80));
      }
      if (result.status !== 'success') throw new Error(result.message || 'Import failed');

      // Also hydrate local IndexedDB so the UI immediately reflects the restored online backup
      const validTables = new Set(db.tables.map(tbl => tbl.name));
      const tablesToRestore = Object.keys(payload).filter(k => k !== '_meta' && validTables.has(k) && Array.isArray(payload[k]));
      if (tablesToRestore.length > 0) {
        await db.transaction('rw', tablesToRestore.map(n => db.table(n)), async () => {
          for (const tableName of tablesToRestore) {
            const rows = payload[tableName].map(r => ({
              ...r,
              sync_status: r.sync_status || 'SYNCED'
            }));
            if (rows.length > 0) {
              await db.table(tableName).bulkPut(rows);
            }
          }
        });
      }

      dialog.alert({ variant: 'success', message: t('online_restore_success') || 'Online database restored successfully!' });
    } catch (err) {
      console.error(err);
      dialog.alert({ variant: 'error', message: t('online_restore_failed') || 'Failed to restore online database' });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const tabs = [
    {
      id: 'company',
      path: '/settings',
      allowed: canCompany,
      label: isRTL ? 'هوية وبيانات المنشأة' : 'Company Profile & Branding',
      icon: Building2,
      desc: isRTL ? 'الشعار، الأسماء، العناوين، والبيانات الضريبية' : 'Logo, names, contact & tax credentials'
    },
    {
      id: 'server',
      path: '/settings/server',
      allowed: canServer,
      label: isRTL ? 'السيرفر وقاعدة البيانات الأونلاين' : 'Cloud Server & MySQL Sync',
      icon: Server,
      desc: isRTL ? 'ربط خادم MySQL السحابي للمزامنة الحية' : 'Remote database credentials & latency test'
    },
    {
      id: 'database',
      path: '/settings/database',
      allowed: canDatabase,
      label: isRTL ? 'النسخ الاحتياطي والأرشيف' : 'Backup & Archive Hub',
      icon: Database,
      desc: isRTL ? 'تصدير واستيراد قواعد البيانات المحلية والأونلاين' : 'Export & restore IndexedDB and MySQL JSON dumps'
    }
  ];

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Executive Header Banner */}
      <div className="glass-card" style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', border: '1px solid var(--border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge-pill badge-pill-primary">
              <Sliders size={13} />
              SYSTEM CONTROL
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isRTL ? (companyForm.company_name_ar || companyForm.company_name_en) : (companyForm.company_name_en || companyForm.company_name_ar)} v2026
            </span>
          </div>
          <h1 className="page-title" style={{ margin: '0 0 0.35rem 0', fontSize: '1.75rem', fontWeight: 900 }}>
            {isRTL ? 'إعدادات المنظومة وهوية المصنع' : 'System Administration & Factory Identity'}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>
            {isRTL 
              ? 'التحكم المركزي في هوية الشركة، خوادم المزامنة السحابية، والنسخ الاحتياطي لقواعد البيانات.'
              : 'Centralized control for corporate branding, cloud MySQL sync, and database backup/restore.'}
          </p>
        </div>

        {/* Security / RBAC Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.95rem',
            borderRadius: '10px',
            background: hasDbPermission ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: hasDbPermission ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            color: hasDbPermission ? '#10b981' : '#ef4444'
          }}>
            {hasDbPermission ? <ShieldCheck size={18} /> : <Lock size={18} />}
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                {user?.role || 'User'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {hasDbPermission 
                  ? (isRTL ? 'صلاحيات إدارة كاملة' : 'Admin Privileges Active') 
                  : (isRTL ? 'صلاحيات محدودة' : 'Restricted Access')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '0.75rem' 
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (!tab.allowed) {
                  dialog.alert({
                    variant: 'warning',
                    title: isRTL ? 'قسم مقيد بالصلاحيات' : 'Restricted Section',
                    message: isRTL 
                      ? `ليس لديك صلاحية الوصول إلى قسم (${tab.label}). يرجى مراجعة مدير النظام لتفعيل الصلاحية من مصفوفة الصلاحيات.`
                      : `You do not have permission to access (${tab.label}). Please contact an administrator.`
                  });
                  return;
                }
                setActiveTab(tab.id);
              }}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '1rem 1.15rem',
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--surface-hover)' : 'var(--surface)',
                boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                cursor: tab.allowed ? 'pointer' : 'not-allowed',
                opacity: tab.allowed ? 1 : 0.65,
                textAlign: isRTL ? 'right' : 'left',
                transition: 'all 0.18s ease'
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: isActive ? 'var(--primary)' : 'var(--surface-hover)',
                color: isActive ? '#fff' : (tab.allowed ? 'var(--text-muted)' : '#ef4444'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.18s ease'
              }}>
                <Icon size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  <span style={{ 
                    fontWeight: isActive ? 800 : 700, 
                    fontSize: '0.9rem', 
                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}>
                    {tab.label}
                  </span>
                  {!tab.allowed && (
                    <span title={isRTL ? 'يتطلب صلاحية في مصفوفة الصلاحيات' : 'Requires permission in matrix'} style={{ color: '#ef4444', display: 'inline-flex' }}>
                      <Lock size={13} />
                    </span>
                  )}
                </div>
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {tab.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* RBAC Warning Banner if user lacks permissions for current tab */}
      {((activeTab === 'company' && !canCompany) ||
        (activeTab === 'server' && !canServer) ||
        (activeTab === 'database' && !canDatabase)) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444'
        }}>
          <ShieldAlert size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '2px' }}>
              {isRTL ? 'هذا القسم مقيد بالصلاحيات' : 'Restricted Section'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {isRTL 
                ? `أنت مسجل حالياً بدور (${user?.role || 'مستخدم'}). هذا القسم من الإعدادات مقفل ويتطلب تفعيل الصلاحية المحددة في مصفوفة الصلاحيات.`
                : `You are logged in with role (${user?.role || 'User'}). This settings section is restricted and requires specific authorization in the Permission Matrix.`}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY PROFILE & BRANDING */}
      {/* ========================================================================= */}
      {activeTab === 'company' && (
        <div className="glass-card" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          
          {/* Header & Live Stationery Preview Box */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '1.5rem', 
            borderBottom: '1px solid var(--border)', 
            paddingBottom: '1.75rem', 
            marginBottom: '1.75rem',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <Building2 size={24} style={{ color: 'var(--primary)' }} />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? 'هوية المنشأة وعنوان الفواتير المطبوعة' : 'Enterprise Identity & Letterhead'}
                </h2>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {isRTL 
                  ? 'يتم تطبيق هذا الشعار واسم المصنع والأرقام الضريبية ورقم الآيبان فوراً وبشكل تلقائي في جميع عروض الأسعار، أوامر البيع، وفواتير الإنتاج المطبوعة.'
                  : 'Changes here are instantly mirrored onto all quotation headers, sales invoices, shipping waybills, and official system printouts.'}
              </p>
            </div>

            {/* Official Stationery Card Mockup Preview */}
            <div style={{
              background: 'var(--surface-hover)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {companyForm.logo && companyForm.logo.startsWith('data:') ? (
                  <img 
                    src={companyForm.logo} 
                    alt="Logo Preview" 
                    style={{ height: 42, width: 'auto', maxWidth: 120, objectFit: 'contain', background: 'transparent' }}
                  />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', flexShrink: 0 }}>
                    {companyForm.logo_symbol || 'U'}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{isRTL ? (companyForm.company_name_ar || 'اسم المصنع') : (companyForm.company_name_en || 'Factory Name')}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRTL ? companyForm.tagline_ar : companyForm.tagline_en}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                    {companyForm.tax_number ? `TRN: ${companyForm.tax_number}` : ''}
                  </span>
                </div>
              </div>
              <span className="badge-pill badge-pill-success" style={{ fontSize: '0.7rem' }}>
                <Check size={12} /> {isRTL ? 'معاينة حية' : 'Live Preview'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Logo Upload Section */}
            <div style={{
              background: 'var(--surface-hover)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              alignItems: 'center'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {isRTL ? 'الشعار الرسمي للمصنع (Official Logo)' : 'Official Plant Logo'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {companyForm.logo ? (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={companyForm.logo} 
                        alt="Logo" 
                        style={{ width: '74px', height: '74px', borderRadius: '10px', objectFit: 'contain', background: '#fff', padding: '4px', border: '1px solid var(--border)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setCompanyForm(prev => ({ ...prev, logo: '' }))}
                        style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                        title={isRTL ? 'إزالة الشعار' : 'Remove Logo'}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '74px', height: '74px', borderRadius: '10px', background: 'var(--surface)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <Image size={28} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', fontSize: '0.84rem', background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <UploadCloud size={16} />
                      <span>{companyForm.logo ? (isRTL ? 'تغيير الشعار' : 'Change Logo') : (isRTL ? 'رفع الشعار (PNG/JPG)' : 'Upload Logo')}</span>
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {isRTL ? 'يُفضل خلفية شفافة بحجم أقل من 2MB' : 'Max 2MB, transparent PNG or JPG recommended'}
                    </span>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {isRTL ? 'رمز الشعار البديل (Short Monogram)' : 'Logo Monogram / Symbol'}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={companyForm.logo_symbol || ''}
                  onChange={e => setCompanyForm(prev => ({ ...prev, logo_symbol: e.target.value.toUpperCase() }))}
                  placeholder="e.g. U or ERP"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.92rem', fontWeight: 800 }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
                  {isRTL ? 'يظهر كأيقونة مختصرة في الشريط الجانبي في حال عدم توفر صورة الشعار' : 'Fallback icon in sidebar header when image is not uploaded'}
                </span>
              </div>
            </div>

            {/* Names & Taglines Section */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.85rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Globe size={16} style={{ color: 'var(--primary)' }} />
                {isRTL ? 'الأسماء والوصف باللغتين العربية والإنجليزية' : 'Bilingual Names & Taglines'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'اسم المصنع / الشركة (بالعربية) *' : 'Company Name (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.company_name_ar || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, company_name_ar: e.target.value }))}
                    placeholder="مثال: ألترا باك لحلول التعبئة والتغليف"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'اسم المصنع / الشركة (بالإنجليزية) *' : 'Company Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.company_name_en || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, company_name_en: e.target.value }))}
                    placeholder="e.g. Ultra Pack Packaging ERP"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'شعار / وصف النشاط (بالعربية)' : 'Tagline / Slogan (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.tagline_ar || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, tagline_ar: e.target.value }))}
                    placeholder="مثال: نظام متكامل لإدارة وتخطيط مصانع الكرتون"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'شعار / وصف النشاط (بالإنجليزية)' : 'Tagline / Slogan (English)'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.tagline_en || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, tagline_en: e.target.value }))}
                    placeholder="e.g. Packaging Solutions & Production ERP"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Contact Details Section */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.85rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Phone size={16} style={{ color: 'var(--primary)' }} />
                {isRTL ? 'بيانات الاتصال والتواصل' : 'Contact & Communication Channels'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'هاتف المصنع الأرضي' : 'Office / Plant Telephone'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.phone || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="02-2345678"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'موبايل المبيعات / واتساب' : 'Mobile / WhatsApp'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.mobile || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="01012345678"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'البريد الإلكتروني الرسمي' : 'Official Email'}
                  </label>
                  <input
                    type="email"
                    value={companyForm.email || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@mycompany.com"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'الموقع الإلكتروني' : 'Website'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.website || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="www.mycompany.com"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Legal & Banking Grid */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.85rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Landmark size={16} style={{ color: 'var(--primary)' }} />
                {isRTL ? 'البيانات الضريبية والحسابات البنكية' : 'Tax Registrations & Banking Credentials'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'الرقم الضريبي (Tax No.)' : 'Tax Registration Number'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.tax_number || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, tax_number: e.target.value }))}
                    placeholder="e.g. 100-234-567"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'السجل التجاري (CR No.)' : 'Commercial Registry (CR)'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.commercial_reg || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, commercial_reg: e.target.value }))}
                    placeholder="e.g. 89421"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'اسم البنك للتحويلات' : 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.bank_name || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g. National Bank of Egypt"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'رقم الحساب / الآيبان (IBAN)' : 'Bank Account / IBAN'}
                  </label>
                  <input
                    type="text"
                    value={companyForm.bank_account || ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, bank_account: e.target.value }))}
                    placeholder="EG50000200..."
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'معدل استهلاك الخامة الافتراضي للوحدة (BOM)' : 'Default Material Consumption / Unit'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={companyForm.consumption_per_unit ?? ''}
                    onChange={e => setCompanyForm(prev => ({ ...prev, consumption_per_unit: e.target.value }))}
                    placeholder={isRTL ? 'يُستخدم إذا لم يُحدد على الصنف' : 'Fallback if not set on item'}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {isRTL ? 'معامل خصم التأخير من اليومية (الافتراضي 0.5 = نصف يوم)' : 'Late Attendance Deduction Factor (Default 0.5)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={companyForm.late_deduction_days ?? 0.5}
                    onChange={e => setCompanyForm(prev => ({ ...prev, late_deduction_days: e.target.value }))}
                    placeholder="0.5"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                {isRTL ? 'عنوان المصنع والمقر الرئيسي (العنوان المطبوع بالفواتير)' : 'Factory & Plant Address (Printed on Invoices)'}
              </label>
              <input
                type="text"
                value={companyForm.address_ar || ''}
                onChange={e => setCompanyForm(prev => ({ ...prev, address_ar: e.target.value }))}
                placeholder="مثال: المنطقة الصناعية الثالثة - العاشر من رمضان - مصر"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
              />
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="submit"
                disabled={isSavingCompany}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.75rem 1.85rem',
                  fontWeight: 800,
                  fontSize: '0.92rem'
                }}
              >
                {isSavingCompany ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                <span>{isSavingCompany ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ وتطبيق بيانات وهوية الشركة' : 'Save & Apply Company Identity')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONLINE CLOUD SERVER & MYSQL SETUP */}
      {/* ========================================================================= */}
      {activeTab === 'server' && (
        <div className="glass-card" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Server size={26} style={{ color: 'var(--primary)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? 'إعدادات وخادم السيرفر الأونلاين (Remote MySQL Server)' : 'Remote MySQL Cloud Server Setup'}
                </h2>
                <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {isRTL 
                    ? 'ربط النظام بخادم MySQL سحابي لمزامنة بيانات المصنع بين جميع الأجهزة والأفرع لحظياً وبدون انقطاع.' 
                    : 'Configure master cloud MySQL database credentials for automatic real-time sync across plant workstations.'}
                </p>
              </div>
            </div>

            <span className="badge-pill badge-pill-primary">
              <PlugZap size={14} /> {testStatus?.serverVersion ? testStatus.serverVersion : (isRTL ? 'MySQL / MariaDB' : 'MySQL / MariaDB')}
            </span>
          </div>

          <form onSubmit={handleSaveServer}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isRTL ? 'عنوان السيرفر (Host / IP / Domain) *' : 'Server Host / IP / Domain *'}
                </label>
                <input
                  type="text"
                  required
                  value={serverHost}
                  onChange={e => setServerHost(e.target.value)}
                  disabled={!hasDbPermission}
                  placeholder="e.g. 192.168.1.100 or db.mycompany.com"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isRTL ? 'المنفذ (Port)' : 'Port'}
                </label>
                <input
                  type="number"
                  value={serverPort}
                  onChange={e => setServerPort(e.target.value)}
                  disabled={!hasDbPermission}
                  placeholder="3306"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isRTL ? 'اسم قاعدة البيانات (Database Name) *' : 'Database Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={serverDb}
                  onChange={e => setServerDb(e.target.value)}
                  disabled={!hasDbPermission}
                  placeholder="packerp"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isRTL ? 'اسم المستخدم (User) *' : 'Database Username *'}
                </label>
                <input
                  type="text"
                  required
                  value={serverUser}
                  onChange={e => setServerUser(e.target.value)}
                  disabled={!hasDbPermission}
                  placeholder="root or erp_admin"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isRTL ? 'كلمة المرور (Password)' : 'Database Password'}
                </label>
                <input
                  type="password"
                  value={serverPass}
                  onChange={e => setServerPass(e.target.value)}
                  disabled={!hasDbPermission}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* Test Status Feedback Alert */}
            {testStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.85rem 1.15rem',
                borderRadius: '10px',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: testStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: testStatus.success ? '#059669' : '#dc2626',
                border: testStatus.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                {testStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span>{testStatus.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleTestServer}
                disabled={!hasDbPermission || isTestingServer}
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.7rem 1.4rem',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  fontWeight: 700,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer'
                }}
              >
                {!hasDbPermission ? <Lock size={16} /> : isTestingServer ? <RefreshCw size={16} className="spin" /> : <PlugZap size={16} />}
                <span>{isTestingServer ? (isRTL ? 'جاري الفحص...' : 'Testing...') : (isRTL ? 'فحص الاتصال بالسيرفر' : 'Test Connection')}</span>
              </button>

              <button
                type="button"
                onClick={handleRequeueAll}
                disabled={!hasDbPermission || isTestingServer || isRequeuing}
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.7rem 1.4rem',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  fontWeight: 700,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer'
                }}
              >
                {isRequeuing ? <RefreshCw size={16} className="spin" /> : <UploadCloud size={16} />}
                <span>{isRTL ? 'إعادة رفع كل البيانات' : 'Re-upload All Data'}</span>
              </button>

              <button
                type="submit"
                disabled={!hasDbPermission || isTestingServer}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.7rem 1.6rem',
                  fontWeight: 800,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer'
                }}
              >
                {!hasDbPermission ? <Lock size={16} /> : <Save size={16} />}
                <span>{isRTL ? 'حفظ إعدادات السيرفر الأونلاين' : 'Save & Connect Server'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BACKUP & DATABASE ARCHIVE HUB */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          
          {/* Offline Local Device Card */}
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: !hasDbPermission ? 0.8 : 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <HardDrive size={24} style={{ color: 'var(--primary)' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      {isRTL ? 'قاعدة البيانات المحلية (IndexedDB)' : 'Local Browser Database'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Device-Specific Offline Storage</span>
                  </div>
                </div>
                {!hasDbPermission && (
                  <span className="badge-pill badge-pill-danger">
                    <Lock size={12} /> {isRTL ? 'مقيد' : 'Locked'}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {isRTL 
                  ? 'هذه النسخة مخزنة مباشرة داخل متصفح جهازك الحالي للعمل عند انقطاع الإنترنت. قم بتصدير نسخة احتياطية دورية لحفظ بياناتك محلياً.'
                  : 'Operates entirely offline within your local browser sandbox. Export a local JSON snapshot periodically to secure your workstation data.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button 
                type="button"
                className="btn" 
                onClick={exportOfflineDB} 
                disabled={!hasDbPermission} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: 'var(--surface-hover)', 
                  padding: '0.7rem',
                  fontWeight: 700,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer' 
                }}
              >
                {!hasDbPermission ? <Lock size={18} /> : <Download size={18} />} 
                {isRTL ? 'تصدير نسخة احتياطية محلية (JSON)' : 'Export Local Backup (JSON)'}
              </button>

              <button 
                type="button"
                className="btn" 
                onClick={() => offlineFileRef.current?.click()} 
                disabled={!hasDbPermission || isImporting} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: 'var(--surface-hover)', 
                  padding: '0.7rem',
                  fontWeight: 700,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer' 
                }}
              >
                {!hasDbPermission ? <Lock size={18} /> : isImporting ? <RefreshCw size={18} className="spin" /> : <Upload size={18} />} 
                {isImporting ? (isRTL ? 'جاري الاستعادة...' : 'Restoring...') : (isRTL ? 'استعادة نسخة محلية من ملف' : 'Restore Local Backup')}
              </button>
              <input type="file" accept=".json" style={{ display: 'none' }} ref={offlineFileRef} onChange={importOfflineDB} disabled={!hasDbPermission} />
            </div>
          </div>

          {/* Master Cloud Database Card */}
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: !hasDbPermission ? 0.8 : 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Cloud size={24} style={{ color: '#10B981' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      {isRTL ? 'قاعدة بيانات السيرفر المركزي (MySQL)' : 'Master MySQL Cloud Database'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-Device Central Hub</span>
                  </div>
                </div>
                {!hasDbPermission && (
                  <span className="badge-pill badge-pill-danger">
                    <Lock size={12} /> {isRTL ? 'مقيد' : 'Locked'}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {isRTL 
                  ? 'هذه قاعدة البيانات المركزية الحية التي يتصل بها جميع موظفي وأقسام المصنع. استعادة نسخة هنا تؤثر مباشرة على جميع المستخدمين.'
                  : 'The central transactional server powering all factory stations. Restoring here will overwrite master records and synchronize to all active users.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button 
                type="button"
                className="btn" 
                onClick={exportOnlineDB} 
                disabled={!hasDbPermission || isExporting} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: 'var(--surface-hover)', 
                  padding: '0.7rem',
                  fontWeight: 700,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer' 
                }}
              >
                {!hasDbPermission ? <Lock size={18} /> : isExporting ? <RefreshCw size={18} className="spin" /> : <Download size={18} />} 
                {isRTL ? 'تصدير نسخة سحابية كاملة (JSON)' : 'Export Cloud Backup (JSON)'}
              </button>

              <button 
                type="button"
                className="btn" 
                onClick={() => onlineFileRef.current?.click()} 
                disabled={!hasDbPermission || isImporting} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                  color: '#dc2626', 
                  borderColor: 'rgba(239, 68, 68, 0.3)', 
                  padding: '0.7rem',
                  fontWeight: 700,
                  cursor: !hasDbPermission ? 'not-allowed' : 'pointer' 
                }}
              >
                {!hasDbPermission ? <Lock size={18} /> : isImporting ? <RefreshCw size={18} className="spin" /> : <Upload size={18} />} 
                {isImporting ? (isRTL ? 'جاري الاستعادة...' : 'Restoring...') : (isRTL ? 'استعادة قاعدة بيانات السيرفر' : 'Restore Online Server')}
              </button>
              <input type="file" accept=".json" style={{ display: 'none' }} ref={onlineFileRef} onChange={importOnlineDB} disabled={!hasDbPermission} />
            </div>
          </div>

          {/* System Cache & Temporary Data Cleaner Card (Web & Desktop) */}
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Trash2 size={24} style={{ color: '#f97316' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      {isRTL ? 'تفريغ الذاكرة المؤقتة (Clear Cache)' : 'Clear System Cache & Buffers'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 700 }}>
                      {typeof window !== 'undefined' && window.jinnworxDesktop ? 'Desktop V8 Engine & Web Cache' : 'Web CacheStorage & HTTP Buffers'}
                    </span>
                  </div>
                </div>
                <span className="badge-pill badge-pill-primary" style={{ backgroundColor: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                  Active
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {isRTL 
                  ? 'يقوم بتفريغ كاش المتصفح والملفات المؤقتة لكود الجافاسكربت ومحرك V8 لسطح المكتب وإعادة تحديث الواجهة فوراً، مع الحفاظ التام والآمن على بياناتك المحلية المسجلة في قواعد البيانات.'
                  : 'Purges web HTTP caches, service workers, and Desktop Electron V8 session buffers, refreshing all runtime assets while strictly preserving your local offline records.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button 
                type="button"
                className="btn" 
                onClick={handleClearCache} 
                disabled={isClearingCache}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: 'rgba(249, 115, 22, 0.1)', 
                  color: '#ea580c', 
                  borderColor: 'rgba(249, 115, 22, 0.35)', 
                  padding: '0.75rem',
                  fontWeight: 800,
                  cursor: isClearingCache ? 'not-allowed' : 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                {isClearingCache ? <RefreshCw size={18} className="spin" /> : <Trash2 size={18} />} 
                {isClearingCache 
                  ? (isRTL ? 'جاري تفريغ الكاش وتحديث النظام...' : 'Clearing Cache & Reloading...') 
                  : (isRTL ? 'مسح الذاكرة المؤقتة وإعادة التحميل (Clear Cache)' : 'Purge All Cache & Hard Reload')}
              </button>
            </div>
          </div>

        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
