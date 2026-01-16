import React, { useEffect, useState } from 'react';
import { auditService } from '../services/auditService';
import {
  MdHistory,
  MdAdd,
  MdEdit,
  MdDelete,
  MdPerson,
  MdInbox
} from 'react-icons/md';
import './AuditLogsPage.css';

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

  return (
    <div className="audit-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1><MdHistory /> سجل التعديلات</h1>
          <p className="subtitle">مراقبة كافة التغييرات والعمليات داخل النظام</p>
        </div>

        <div className="audit-stats">
          <div className="stat-chip add">
            <MdAdd /> {addCount} إضافة
          </div>
          <div className="stat-chip update">
            <MdEdit /> {updateCount} تحديث
          </div>
          <div className="stat-chip delete">
            <MdDelete /> {deleteCount} حذف
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">جاري تحميل السجل...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <MdInbox />
          <p>لا توجد سجلات حالياً</p>
        </div>
      ) : (
        <div className="logs-container">
          {logs.map((log) => {
            const actionType = getActionType(log.action);
            const timestamp = formatTimestamp(log.timestamp);

            return (
              <div key={log.id} className="log-item">
                <div className={`log-icon ${actionType}`}>
                  {getActionIcon(log.action)}
                </div>

                <div className="log-content">
                  <div className="log-header">
                    <span className="log-action">{translateAction(log.action)}</span>
                    <span className="log-entity">{log.entityName}</span>
                    <span className="log-user">
                      <MdPerson /> {log.userEmail}
                    </span>
                  </div>

                  <div className="log-details">
                    {renderDetails(log.details, log.action)}
                  </div>
                </div>

                <div className="log-time">
                  <div className="log-date">{timestamp.date}</div>
                  <div className="log-clock">{timestamp.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
