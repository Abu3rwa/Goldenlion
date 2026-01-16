import React, { useEffect, useState } from 'react';
import { auditService } from '../services/auditService';
import {
  MdHistory,
  MdAdd,
  MdEdit,
  MdDelete,
  MdPerson,
  MdInbox,
  MdDownload
} from 'react-icons/md';
import { exportToCSV } from '../utils/csvExport';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditService.getLogs(100);
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return { date: '...', time: '' };
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      date: new Intl.DateTimeFormat('ar-LY', {
        year: 'numeric', month: 'short', day: 'numeric'
      }).format(date),
      time: new Intl.DateTimeFormat('ar-LY', {
        hour: '2-digit', minute: '2-digit'
      }).format(date)
    };
  };

  const getActionType = (action) => {
    if (action?.startsWith('ADD_')) return 'add';
    if (action?.startsWith('UPDATE_')) return 'update';
    if (action?.startsWith('DELETE_')) return 'delete';
    return 'update';
  };

  const getActionIcon = (action) => {
    const type = getActionType(action);
    switch (type) {
      case 'add': return <MdAdd />;
      case 'delete': return <MdDelete />;
      default: return <MdEdit />;
    }
  };

  const translateAction = (action) => {
    switch (action) {
      case 'ADD_PRODUCT': return 'إضافة منتج';
      case 'UPDATE_PRODUCT': return 'تحديث منتج';
      case 'DELETE_PRODUCT': return 'حذف منتج';
      case 'ADD_SUPPLIER': return 'إضافة مورد';
      case 'UPDATE_SUPPLIER': return 'تحديث مورد';
      case 'DELETE_SUPPLIER': return 'حذف مورد';
      case 'ADD_CUSTOMER': return 'إضافة فرع';
      case 'UPDATE_CUSTOMER': return 'تحديث فرع';
      case 'DELETE_CUSTOMER': return 'حذف فرع';
      default: return action;
    }
  };

  const renderDetails = (details, action) => {
    if (!details) return null;

    const fieldTranslations = {
      name: 'الاسم',
      quantity: 'الكمية',
      price: 'سعر البيع',
      costPrice: 'سعر التكلفة',
      supplierId: 'المورد',
      contact: 'جهة الاتصال',
      address: 'العنوان',
      phone: 'الهاتف'
    };

    if ((action === 'UPDATE_PRODUCT' || action === 'UPDATE_SUPPLIER') && Array.isArray(details)) {
      return (
        <ul className="details-list">
          {details.map((change, idx) => (
            <li key={idx}>
              <span className="field-name">{fieldTranslations[change.field] || change.field}:</span>
              <span className="val-old">{change.old}</span>
              <span>→</span>
              <span className="val-new">{change.new}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (action?.startsWith('ADD_')) {
      return <span className="action-tag add"><MdAdd /> إضافة جديدة</span>;
    }

    if (action?.startsWith('DELETE_')) {
      return <span className="action-tag delete"><MdDelete /> تم الحذف</span>;
    }

    return null;
  };

  // Calculate stats
  const addCount = logs.filter(l => l.action?.startsWith('ADD_')).length;
  const updateCount = logs.filter(l => l.action?.startsWith('UPDATE_')).length;
  const deleteCount = logs.filter(l => l.action?.startsWith('DELETE_')).length;

  const handleExport = () => {
    const headers = ['timestamp', 'action', 'entityName', 'userEmail', 'details'];
    exportToCSV(logs, 'audit_logs', headers);
  };

  return (
    <div className="container-fluid px-0">
      <div className="row mb-4 align-items-center">
        <div className="col-12 col-md-6 mb-3 mb-md-0">
          <h1 className="h3 mb-1"><MdHistory className="ms-1" /> سجل التعديلات</h1>
          <p className="text-muted mb-0 small">مراقبة كافة التغييرات والعمليات داخل النظام</p>
        </div>

        <div className="col-12 col-md-6">
          <div className="d-flex justify-content-md-end align-items-center gap-3">
            <button 
              className="btn btn-outline-gold btn-sm d-flex align-items-center gap-2"
              onClick={handleExport}
              disabled={logs.length === 0}
            >
              <MdDownload /> تصدير CSV
            </button>
            <div className="d-flex gap-2">
              <div className="badge bg-success-subtle text-success border px-3 py-2">
                <MdAdd /> {addCount} إضافة
              </div>
              <div className="badge bg-warning-subtle text-warning border px-3 py-2">
                <MdEdit /> {updateCount} تحديث
              </div>
              <div className="badge bg-danger-subtle text-danger border px-3 py-2">
                <MdDelete /> {deleteCount} حذف
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-gold" role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <div className="card-body">
            <MdInbox className="display-1 text-muted mb-3" />
            <p className="h5 text-muted">لا توجد سجلات حالياً</p>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>التوقيت</th>
                  <th>العملية</th>
                  <th>العنصر</th>
                  <th>التفاصيل</th>
                  <th>بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionType = getActionType(log.action);
                  const timestamp = formatTimestamp(log.timestamp);

                  return (
                    <tr key={log.id}>
                      <td className="small text-muted text-nowrap">
                        <div>{timestamp.date}</div>
                        <div>{timestamp.time}</div>
                      </td>
                      <td>
                        <span className={`badge bg-${actionType === 'add' ? 'success' : actionType === 'delete' ? 'danger' : 'warning'}-subtle text-${actionType === 'add' ? 'success' : actionType === 'delete' ? 'danger' : 'warning'} border`}>
                          {getActionIcon(log.action)} {translateAction(log.action)}
                        </span>
                      </td>
                      <td className="fw-bold">{log.entityName}</td>
                      <td>
                        <div className="small">
                          {renderDetails(log.details, log.action)}
                        </div>
                      </td>
                      <td className="small">
                        <MdPerson className="me-1" /> {log.userEmail?.split('@')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
