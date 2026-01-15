import React, { useEffect, useState } from 'react';
import { auditService } from '../services/auditService';
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
    if (!timestamp) return '...';
    // Handle Firebase Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  };

  const renderDetails = (details, action) => {
    if (!details) return '-';
    
    if (action === 'UPDATE_PRODUCT' && Array.isArray(details)) {
      return (
        <ul className="details-list">
          {details.map((change, idx) => (
            <li key={idx}>
              <span className="field-name">{change.field}</span>: 
              <span className="val-old">{change.old}</span> 
              <span> &rarr; </span> 
              <span className="val-new">{change.new}</span>
            </li>
          ))}
        </ul>
      );
    }
    
    if (action === 'ADD_PRODUCT') {
        return <span className="action-tag add">منتج جديد</span>;
    }

    if (action === 'DELETE_PRODUCT') {
        return <span className="action-tag delete">حذف نهائي</span>;
    }

    return JSON.stringify(details);
  };

  const translateAction = (action) => {
      switch(action) {
          case 'ADD_PRODUCT': return 'إضافة منتج';
          case 'UPDATE_PRODUCT': return 'تحديث منتج';
          case 'DELETE_PRODUCT': return 'حذف منتج';
          default: return action;
      }
  }

  return (
    <div className="audit-page">
      <h1>سجل العمليات (Audit Trail)</h1>
      <p className="subtitle">تتبع جميع التغييرات في النظام لضمان الأمان والشفافية.</p>

      {loading ? (
        <div className="loading">جاري تحميل السجل...</div>
      ) : (
        <div className="table-container">
          <table className="audit-table">
            <thead>
              <tr>
                <th>التوقيت</th>
                <th>المستخدم</th>
                <th>الإجراء</th>
                <th>الكيان (المنتج)</th>
                <th>التفاصيل (من &larr; إلى)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="col-time">{formatTimestamp(log.timestamp)}</td>
                  <td className="col-user">{log.userEmail}</td>
                  <td className="col-action">{translateAction(log.action)}</td>
                  <td className="col-entity">{log.entityName}</td>
                  <td className="col-details">{renderDetails(log.details, log.action)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center'}}>لا توجد سجلات حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
