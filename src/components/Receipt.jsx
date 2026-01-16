import React from 'react';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import { TRANSACTION_TYPES } from '../utils/constants';
import { GiLion } from 'react-icons/gi';

const Receipt = ({ transaction, company }) => {
    if (!transaction) return null;

    const isStockIn = transaction.type === TRANSACTION_TYPES.STOCK_IN;
    const date = transaction.createdAt
        ? (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt))
        : new Date();

    const items = transaction.items || [];
    const totalAmount = isStockIn
        ? (transaction.totalCostCents || 0)
        : (transaction.totalPriceCents || 0);

    return (
        <div className="receipt-container bg-white position-relative" style={{
            direction: 'rtl',
            fontFamily: 'Tajwal, sans-serif',
            maxWidth: '210mm',
            margin: '0 auto',
            minHeight: '297mm', // A4 height
            padding: '20px'
        }}>
            {/* Golden Frame Border */}
            <div style={{
                border: '4px double #c5a059',
                padding: '20px',
                height: '100%',
                position: 'relative'
            }}>

                {/* Header Section */}
                <div className="d-flex justify-content-between align-items-center mb-5 border-bottom border-warning pb-3">
                    <div className="text-center">
                        <GiLion className="display-4 text-gold mb-2" style={{ color: '#c5a059' }} />
                    </div>
                    <div className="text-center flex-grow-1">
                        <h1 className="fw-bold mb-1" style={{ color: '#c5a059' }}>{company.companyName || 'الأسد الذهبي'}</h1>
                        <p className="text-muted mb-0">للتجارة والاستيراد</p>
                        <p className="small text-muted">نظام إدارة المخزون والمحاسبة</p>
                    </div>
                    <div className="text-center" style={{ minWidth: '100px' }}>
                        <div className="border border-gold p-2 rounded" style={{ borderColor: '#c5a059' }}>
                            <div className="small text-muted">رقم العملية</div>
                            <div className="fw-bold fs-4" style={{ color: '#c5a059' }}>
                                {transaction.displayId || `#${transaction.id.slice(0, 6).toUpperCase()}`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Info Grid */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card border-gold mb-3" style={{ borderColor: '#efe5d0' }}>
                            <div className="card-body bg-light">
                                <div className="row g-3">
                                    <div className="col-6 col-md-3">
                                        <label className="text-muted small d-block">نوع المستند</label>
                                        <span className="fw-bold fs-5">
                                            {isStockIn ? 'إيصال استلام (وارد)' : 'فاتورة مبيعات (صادر)'}
                                        </span>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <label className="text-muted small d-block">التاريخ والوقت</label>
                                        <span className="fw-bold">
                                            {date.toLocaleDateString('ar-LY')}
                                        </span>
                                        <div className="small text-muted">
                                            {date.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <label className="text-muted small d-block">
                                            {isStockIn ? 'المورد' : 'العميل/الفرع'}
                                        </label>
                                        <span className="fw-bold fs-5">
                                            {isStockIn ? transaction.supplierName : transaction.customerName || 'عام'}
                                        </span>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <label className="text-muted small d-block">مدخل البيانات</label>
                                        <span className="fw-bold">
                                            {transaction.createdBy?.email?.split('@')[0] || 'System'}
                                        </span>
                                        {/* Fallback role, usually we'd want this from user profile if available in props */}
                                        <div className="badge bg-warning text-dark opacity-50">محاسب</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="table-responsive mb-4">
                    <table className="table table-bordered border-gold" style={{ borderColor: '#e0d0b0' }}>
                        <thead style={{ backgroundColor: '#c5a059', color: 'white' }}>
                            <tr>
                                <th className="py-2" style={{ width: '5%' }}>#</th>
                                <th className="py-2" style={{ width: '45%' }}>المنتج / الصنف</th>
                                <th className="py-2 text-center" style={{ width: '15%' }}>الكمية</th>
                                <th className="py-2 text-center" style={{ width: '15%' }}>السعر</th>
                                <th className="py-2 text-center" style={{ width: '20%' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="text-center">{idx + 1}</td>
                                    <td className="fw-bold">{item.productName || 'غير محدد'}</td>
                                    <td className="text-center bg-light">{item.quantity || 0}</td>
                                    <td className="text-center">
                                        {formatCurrency(fromCents(isStockIn ? (item.unitCostCents || 0) : (item.unitPriceCents || 0)), company.currency)}
                                    </td>
                                    <td className="text-center fw-bold">
                                        {formatCurrency(fromCents(item.lineTotalCents || 0), company.currency)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-4 text-muted">لا توجد عناصر</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="fw-bold fs-5" style={{ backgroundColor: '#fcf8f0' }}>
                            <tr>
                                <td colSpan="4" className="text-end py-3">الإجمالي النهائي</td>
                                <td className="text-center py-3 text-gold" style={{ color: '#c5a059' }}>
                                    {formatCurrency(fromCents(totalAmount), company.currency)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Notes Section */}
                {transaction.notes && (
                    <div className="mb-5">
                        <h6 className="fw-bold mb-2 text-muted">ملاحظات:</h6>
                        <div className="p-3 bg-light border rounded" style={{ borderStyle: 'dashed' }}>
                            {transaction.notes}
                        </div>
                    </div>
                )}

                {/* Signatures Footer */}
                <div className="row mt-auto pt-5">
                    <div className="col-4 text-center">
                        <div className="border-top border-secondary pt-2" style={{ width: '80%', margin: '0 auto' }}>
                            <p className="fw-bold mb-0">توقيع المستلم</p>
                        </div>
                    </div>
                    <div className="col-4 text-center">
                        <div className="border-top border-secondary pt-2" style={{ width: '80%', margin: '0 auto' }}>
                            <p className="fw-bold mb-0">المحاسب</p>
                            <p className="small text-muted">{transaction.createdBy?.email?.split('@')[0]}</p>
                        </div>
                    </div>
                    <div className="col-4 text-center">
                        <div className="d-flex justify-content-center align-items-center">
                            <div className="border border-gold rounded-circle d-flex justify-content-center align-items-center"
                                style={{ width: '80px', height: '80px', borderColor: '#c5a059', color: '#c5a059', transform: 'rotate(-15deg)' }}>
                                <small className="fw-bold">معتمد</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="position-absolute bottom-0 start-0 end-0 text-center pb-2 small text-muted">
                    <p className="mb-0">العنوان: طرابلس - ليبيا | هاتف: 091-0000000</p>
                    <p className="mb-1" style={{ fontSize: '10px' }}>Generated by System ID: {transaction.id}</p>
                </div>

            </div>
        </div>
    );
};

export default Receipt;
