import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions, addTransactionComment } from '../store/transactionsSlice';
import { userService } from '../services/userService';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import { TRANSACTION_TYPES } from '../utils/constants';
import {
    MdHistory,
    MdArrowDownward,
    MdArrowUpward,
    MdPerson,
    MdAccessTime,
    MdComment,
    MdSend,
    MdInbox,
    MdFilterList,
    MdPrint,
    MdPictureAsPdf
} from 'react-icons/md';
import Receipt from '../components/Receipt';
import PrintWrapper from '../components/PrintWrapper';

const TransactionsPage = () => {
    const dispatch = useDispatch();
    const { transactions, status } = useSelector((state) => state.transactions);
    const { userProfile } = useSelector((state) => state.auth);
    const { currency, companyName, companyNameEn, address, phone, terms } = useSelector((state) => state.company);

    const [filterType, setFilterType] = useState('');
    const [commentInputs, setCommentInputs] = useState({});
    const [selectedTxForPrint, setSelectedTxTxForPrint] = useState(null);

    const canComment = userService.canPerformAction(userProfile?.roles || [], 'ADD_COMMENT');

    useEffect(() => {
        dispatch(fetchTransactions());
    }, [dispatch]);

    const handlePrint = (tx) => {
        setSelectedTxTxForPrint(tx);
        // Wait for state to update and React Portal to render before printing
        setTimeout(() => {
            window.print();
        }, 800);
    };

    const handleAddComment = async (transactionId) => {
        const text = commentInputs[transactionId]?.trim();
        if (!text || !canComment) return;

        await dispatch(addTransactionComment({ transactionId, commentText: text }));
        setCommentInputs({ ...commentInputs, [transactionId]: '' });
        dispatch(fetchTransactions());
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
        if (filterType && tx.type !== filterType) return false;
        return true;
    });

    // Calculate stats
    const stockInTxs = transactions.filter(t => t.type === TRANSACTION_TYPES.STOCK_IN);
    const stockOutTxs = transactions.filter(t => t.type === TRANSACTION_TYPES.STOCK_OUT);
    const totalInValue = stockInTxs.reduce((sum, tx) => sum + fromCents(tx.totalCostCents || 0), 0);
    const totalOutValue = stockOutTxs.reduce((sum, tx) => sum + fromCents(tx.totalPriceCents || 0), 0);

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ar-LY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getInitials = (email) => {
        if (!email) return '؟';
        return email.charAt(0).toUpperCase();
    };

    return (
        <div className="container-fluid px-0">
            {/* Page Header with Stats */}
            <div className="row mb-4 align-items-center">
                <div className="col-12 col-md-6 mb-3 mb-md-0">
                    <h1 className="h3 mb-1"><MdHistory className="ms-1" /> سجل المعاملات</h1>
                    <p className="text-muted mb-0 small">جميع حركات الوارد والصادر</p>
                </div>
                <div className="col-12 col-md-6">
                    <div className="row g-3">
                        <div className="col-6">
                            <div className="card border-0 shadow-sm bg-success-subtle">
                                <div className="card-body py-2 px-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <MdArrowDownward className="text-success fs-4" />
                                        <div>
                                            <div className="text-muted small">إجمالي الوارد</div>
                                            <div className="fw-bold">{formatCurrency(totalInValue, currency)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="card border-0 shadow-sm bg-danger-subtle">
                                <div className="card-body py-2 px-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <MdArrowUpward className="text-danger fs-4" />
                                        <div>
                                            <div className="text-muted small">إجمالي الصادر</div>
                                            <div className="fw-bold">{formatCurrency(totalOutValue, currency)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
                    <MdFilterList className="text-muted fs-5" />
                    <div className="btn-group btn-group-sm">
                        <button
                            className={`btn btn-outline-secondary ${filterType === '' ? 'active' : ''}`}
                            onClick={() => setFilterType('')}
                        >
                            الكل ({transactions.length})
                        </button>
                        <button
                            className={`btn btn-outline-success ${filterType === TRANSACTION_TYPES.STOCK_IN ? 'active' : ''}`}
                            onClick={() => setFilterType(TRANSACTION_TYPES.STOCK_IN)}
                        >
                            <MdArrowDownward /> استلام ({stockInTxs.length})
                        </button>
                        <button
                            className={`btn btn-outline-danger ${filterType === TRANSACTION_TYPES.STOCK_OUT ? 'active' : ''}`}
                            onClick={() => setFilterType(TRANSACTION_TYPES.STOCK_OUT)}
                        >
                            <MdArrowUpward /> إخراج ({stockOutTxs.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            {status === 'loading' ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-gold" role="status">
                        <span className="visually-hidden">جاري التحميل...</span>
                    </div>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="card border-0 shadow-sm text-center py-5">
                    <div className="card-body">
                        <MdInbox className="display-1 text-muted mb-3" />
                        <p className="h5 text-muted">لا توجد معاملات مسجلة</p>
                    </div>
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>التوقيت</th>
                                    <th>رقم العملية</th>
                                    <th>النوع</th>
                                    <th>الجهة</th>
                                    <th>العناصر</th>
                                    <th>الإجمالي</th>
                                    <th>بواسطة</th>
                                    <th>ملاحظات/تعليقات</th>
                                    <th className="text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(tx => {
                                    const isStockIn = tx.type === TRANSACTION_TYPES.STOCK_IN;
                                    return (
                                        <tr key={tx.id}>
                                            <td className="small text-muted">{formatDate(tx.createdAt)}</td>
                                            <td className="fw-bold text-dark">
                                                #{tx.displayId || tx.id.slice(0, 6)}
                                            </td>
                                            <td>
                                                <span className={`badge ${isStockIn ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} border`}>
                                                    {isStockIn ? 'استلام' : 'إخراج'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="fw-bold">{isStockIn ? tx.supplierName : tx.customerName || 'غير محدد'}</div>
                                            </td>
                                            <td>
                                                <ul className="list-unstyled mb-0 small">
                                                    {tx.items?.map((item, idx) => (
                                                        <li key={idx} className="text-nowrap">
                                                            • {item.productName} ({item.quantity})
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td>
                                                <div className={`fw-bold ${isStockIn ? 'text-danger' : 'text-success'}`}>
                                                    {formatCurrency(
                                                        fromCents(isStockIn ? tx.totalCostCents : tx.totalPriceCents),
                                                        currency
                                                    )}
                                                </div>
                                            </td>
                                            <td className="small">{tx.createdBy?.displayName || tx.createdBy?.email?.split('@')[0]}</td>
                                            <td>
                                                <div className="compact-comments">
                                                    {tx.notes && <p className="mb-1 small"><strong>ملاحظة:</strong> {tx.notes}</p>}
                                                    {tx.comments?.length > 0 && (
                                                        <div className="mb-1">
                                                            <span className="badge bg-light text-dark border">
                                                                <MdComment /> {tx.comments.length} تعليقات
                                                            </span>
                                                        </div>
                                                    )}
                                                    {canComment && (
                                                        <div className="input-group input-group-sm mt-1" style={{ maxWidth: '200px' }}>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                placeholder="تعليق..."
                                                                value={commentInputs[tx.id] || ''}
                                                                onChange={(e) => setCommentInputs({ ...commentInputs, [tx.id]: e.target.value })}
                                                                onKeyPress={(e) => e.key === 'Enter' && handleAddComment(tx.id)}
                                                            />
                                                            <button className="btn btn-outline-gold" onClick={() => handleAddComment(tx.id)}><MdSend /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => handlePrint(tx)}
                                                        title="طباعة الإيصال"
                                                    >
                                                        <MdPrint />
                                                    </button>
                                                    {tx.receiptUrl && (
                                                        <a
                                                            href={tx.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline-danger"
                                                            title="عرض PDF"
                                                        >
                                                            <MdPictureAsPdf />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Hidden Printable Area */}
            {selectedTxForPrint && (
                <PrintWrapper>
                    <Receipt
                        transaction={selectedTxForPrint}
                        company={{
                            companyName: companyName || 'مجمـوعة الأسـد',
                            companyNameEn,
                            currency,
                            address,
                            phone,
                            terms
                        }}
                    />
                </PrintWrapper>
            )}
        </div>
    );
};

export default TransactionsPage;
