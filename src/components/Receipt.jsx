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

    // Official A4 Dimensions in mm
    const A4_WIDTH = '210mm';
    const A4_HEIGHT = '297mm';
    const PADDING = '15mm'; // Standard print margin

    return (
        <div className="receipt-container bg-white position-relative" style={{
            direction: 'rtl',
            fontFamily: "'Tajwal', 'Segoe UI', sans-serif",
            width: A4_WIDTH,
            height: A4_HEIGHT,
            margin: '0 auto',
            padding: PADDING,
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            color: '#333',
            overflow: 'hidden', // Prevent spillover
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Watermark Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.03,
                zIndex: 0,
                pointerEvents: 'none'
            }}>
                <GiLion style={{ fontSize: '180mm', color: '#000' }} />
            </div>

            {/* Content Wrapper (Z-Index 1 to sit above watermark) */}
            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* 1. Header Section */}
                <header className="d-flex justify-content-between align-items-end mb-4 border-bottom pb-3" style={{ borderColor: '#c5a059' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex justify-content-center align-items-center rounded-circle" style={{
                            width: '60px',
                            height: '60px',
                            background: 'linear-gradient(135deg, #c5a059 0%, #a08040 100%)',
                            color: '#fff',
                            boxShadow: '0 4px 10px rgba(197, 160, 89, 0.3)'
                        }}>
                            <GiLion style={{ fontSize: '36px' }} />
                        </div>
                        <div>
                            <h1 className="fw-bold m-0 text-dark" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>
                                {company.companyName || 'مجمـوعة الأسـد'}
                            </h1>
                            {company.companyNameEn && (
                                <h2 className="m-0 text-muted" style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'serif', marginTop: '2px' }}>
                                    {company.companyNameEn}
                                </h2>
                            )}
                            <p className="m-0 text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                {company.phone ? `هاتف: ${company.phone}` : 'للتجارة والاستيراد العامة'}
                            </p>
                        </div>
                    </div>

                    <div className="text-end">
                        <div className="fw-bold text-uppercase" style={{ color: '#c5a059', fontSize: '18px', letterSpacing: '1px' }}>
                            {isStockIn ? 'إيصال استلام' : 'فاتورة مبيعات'}
                        </div>
                        <div className="text-muted small" style={{ direction: 'ltr' }}>
                            #{transaction.displayId || transaction.id.slice(0, 8).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* 2. Info Grid */}
                <div className="row mb-4 g-3">
                    <div className="col-8">
                        <div className="p-3 rounded" style={{ backgroundColor: '#f9f9f9', border: '1px solid #eee' }}>
                            <div className="row">
                                <div className="col-6 mb-2">
                                    <div className="text-uppercase text-muted" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                                        {isStockIn ? 'المورد' : 'العميل / الفرع'}
                                    </div>
                                    <div className="fw-bold text-dark fs-6">
                                        {isStockIn ? transaction.supplierName : transaction.customerName || 'عميل نقدي'}
                                    </div>
                                </div>
                                <div className="col-6 mb-2">
                                    <div className="text-uppercase text-muted" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                                        بواسطة
                                    </div>
                                    <div className="fw-bold text-dark fs-6">
                                        {transaction.createdBy?.displayName || transaction.createdBy?.email?.split('@')[0] || 'System'}
                                    </div>
                                </div>
                                <div className="col-12">
                                    <div className="text-uppercase text-muted" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                                        العنوان / ملاحظات العميل
                                    </div>
                                    <div className="text-dark small">
                                        {company.address || 'طرابلس، ليبيا'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="p-3 rounded h-100 d-flex flex-column justify-content-center text-center text-white"
                            style={{ background: 'linear-gradient(135deg, #333 0%, #1a1a1a 100%)' }}>
                            <div className="text-uppercase opacity-75" style={{ fontSize: '10px' }}>تاريخ الإصدار</div>
                            <div className="fw-bold fs-5 mb-1">{date.toLocaleDateString('ar-LY')}</div>
                            <div className="opacity-75 small">{date.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <div className="flex-grow-1">
                    <table className="w-100 mb-4" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #c5a059' }}>
                                <th className="py-2 px-3 text-start text-dark" style={{ width: '5%', fontSize: '12px' }}>#</th>
                                <th className="py-2 px-3 text-start text-dark" style={{ width: '45%', fontSize: '12px' }}>تفاصيل الصنف</th>
                                <th className="py-2 px-3 text-center text-dark" style={{ width: '15%', fontSize: '12px' }}>الكمية</th>
                                <th className="py-2 px-3 text-center text-dark" style={{ width: '15%', fontSize: '12px' }}>السعر</th>
                                <th className="py-2 px-3 text-end text-dark" style={{ width: '20%', fontSize: '12px' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td className="py-3 px-3 small text-muted">{idx + 1}</td>
                                    <td className="py-3 px-3 fw-bold text-dark">{item.productName || 'غير محدد'}</td>
                                    <td className="py-3 px-3 text-center small">{item.quantity}</td>
                                    <td className="py-3 px-3 text-center small text-muted">
                                        {formatCurrency(fromCents(isStockIn ? (item.unitCostCents || 0) : (item.unitPriceCents || 0)), company.currency)}
                                    </td>
                                    <td className="py-3 px-3 text-end fw-bold text-dark">
                                        {formatCurrency(fromCents(item.lineTotalCents || 0), company.currency)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">لا توجد عناصر لعرضها</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. Totals & Notes */}
                <div className="row mt-auto">
                    <div className="col-7">
                        {transaction.notes && (
                            <div className="mb-3">
                                <h6 className="fw-bold mb-1 small text-muted text-uppercase">ملاحظات إضافية</h6>
                                <p className="small text-muted m-0 p-2 bg-light rounded" style={{ minHeight: '40px' }}>
                                    {transaction.notes}
                                </p>
                            </div>
                        )}
                        <div className="mt-4 pt-3 border-top">
                            <p className="small text-muted mb-1">الشروط والأحكام:</p>
                            <ul className="small text-muted ps-3 mb-0" style={{ fontSize: '10px' }}>
                                {company.terms ? (
                                    <li style={{ listStyleType: 'none', marginLeft: '-1rem' }}>{company.terms}</li>
                                ) : (
                                    <>
                                        <li>البضاعة المباعة لا ترد ولا تستبدل بعد 14 يوماً.</li>
                                        <li>يرجى الاحتفاظ بهذا الإيصال لأغراض الضمان.</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="col-5">
                        <div className="bg-light p-3 rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="small text-muted">المجموع الفرعي</span>
                                <span className="fw-bold">{formatCurrency(fromCents(totalAmount), company.currency)}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                <span className="small text-muted">الضريبة (0%)</span>
                                <span className="fw-bold">0.00</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="fw-bold fs-5 text-dark">الإجمالي النهائي</span>
                                <span className="fw-bold fs-4" style={{ color: '#c5a059' }}>
                                    {formatCurrency(fromCents(totalAmount), company.currency)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Footer Signature */}
                <div className="mt-5 pt-3">
                    <div className="row align-items-end">
                        <div className="col-4 text-center">
                            <div className="mb-2" style={{ borderBottom: '1px dashed #ccc', height: '40px' }}></div>
                            <div className="small fw-bold text-muted">توقيع المستلم</div>
                        </div>
                        <div className="col-4 text-center">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle border border-2"
                                style={{ width: '80px', height: '80px', borderColor: '#c5a059', color: '#c5a059', opacity: 0.8, transform: 'rotate(-15deg)' }}>
                                <span className="small fw-bold text-uppercase">معتمد</span>
                            </div>
                        </div>
                        <div className="col-4 text-center">
                            <div className="mb-2" style={{ borderBottom: '1px dashed #ccc', height: '40px' }}>
                                {/* Optional: Add dynamic signature image here */}
                            </div>
                            <div className="small fw-bold text-muted">المحاسب / {transaction.createdBy?.displayName || 'المدير'}</div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="text-center mt-4 pt-2 border-top" style={{ color: '#999', fontSize: '9px' }}>
                        <p className="m-0">
                            {company.address ? `${company.address} | ` : ''}
                            {company.phone ? `هاتف: ${company.phone} | ` : ''}
                            System ID: {transaction.id}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Receipt;
