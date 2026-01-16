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
    MdFilterList
} from 'react-icons/md';
import './TransactionsPage.css';

const TransactionsPage = () => {
    const dispatch = useDispatch();
    const { transactions, status } = useSelector((state) => state.transactions);
    const { userProfile } = useSelector((state) => state.auth);
    const { currency } = useSelector((state) => state.company);

    const [filterType, setFilterType] = useState('');
    const [commentInputs, setCommentInputs] = useState({});

    const canComment = userService.canPerformAction(userProfile?.role, 'ADD_COMMENT');

    useEffect(() => {
        dispatch(fetchTransactions());
    }, [dispatch]);

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
        <div className="transactions-page">
            {/* Page Header with Stats */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1><MdHistory /> سجل المعاملات</h1>
                    <p className="subtitle">جميع حركات الوارد والصادر</p>
                </div>

                <div className="stats-summary">
                    <div className="stat-card in">
                        <div className="stat-icon">
                            <MdArrowDownward />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">إجمالي الوارد</span>
                            <span className="stat-value">{formatCurrency(totalInValue, currency)}</span>
                        </div>
                    </div>
                    <div className="stat-card out">
                        <div className="stat-icon">
                            <MdArrowUpward />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">إجمالي الصادر</span>
                            <span className="stat-value">{formatCurrency(totalOutValue, currency)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <MdFilterList style={{ color: 'var(--text-light)', fontSize: '1.25rem' }} />
                <div className="filter-chips">
                    <button
                        className={`filter-chip ${filterType === '' ? 'active' : ''}`}
                        onClick={() => setFilterType('')}
                    >
                        الكل ({transactions.length})
                    </button>
                    <button
                        className={`filter-chip in ${filterType === TRANSACTION_TYPES.STOCK_IN ? 'active' : ''}`}
                        onClick={() => setFilterType(TRANSACTION_TYPES.STOCK_IN)}
                    >
                        <MdArrowDownward /> استلام ({stockInTxs.length})
                    </button>
                    <button
                        className={`filter-chip out ${filterType === TRANSACTION_TYPES.STOCK_OUT ? 'active' : ''}`}
                        onClick={() => setFilterType(TRANSACTION_TYPES.STOCK_OUT)}
                    >
                        <MdArrowUpward /> إخراج ({stockOutTxs.length})
                    </button>
                </div>
            </div>

            {/* Transactions List */}
            {status === 'loading' ? (
                <div className="loading-state">جاري التحميل...</div>
            ) : filteredTransactions.length === 0 ? (
                <div className="empty-state">
                    <MdInbox />
                    <p>لا توجد معاملات مسجلة</p>
                </div>
            ) : (
                <div className="table-responsive shadow-sm">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>التوقيت</th>
                                <th>النوع</th>
                                <th>الجهة</th>
                                <th>العناصر</th>
                                <th>الإجمالي</th>
                                <th>بواسطة</th>
                                <th>ملاحظات/تعليقات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(tx => {
                                const isStockIn = tx.type === TRANSACTION_TYPES.STOCK_IN;
                                return (
                                    <tr key={tx.id}>
                                        <td className="col-time">{formatDate(tx.createdAt)}</td>
                                        <td>
                                            <span className={`badge ${isStockIn ? 'in' : 'out'}`}>
                                                {isStockIn ? 'استلام' : 'إخراج'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{isStockIn ? tx.supplierName : tx.customerName || 'غير محدد'}</strong>
                                        </td>
                                        <td>
                                            <ul className="items-summary">
                                                {tx.items?.map((item, idx) => (
                                                    <li key={idx}>
                                                        {item.productName} ({item.quantity})
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td>
                                            <strong className={isStockIn ? 'text-danger' : 'text-success'}>
                                                {formatCurrency(
                                                    fromCents(isStockIn ? tx.totalCostCents : tx.totalPriceCents),
                                                    currency
                                                )}
                                            </strong>
                                        </td>
                                        <td>{tx.createdBy?.email}</td>
                                        <td>
                                            <div className="compact-comments">
                                                {tx.notes && <p className="tx-note"><strong>ملاحظة:</strong> {tx.notes}</p>}
                                                {tx.comments?.length > 0 && (
                                                    <span className="comment-count">
                                                        <MdComment /> {tx.comments.length}
                                                    </span>
                                                )}
                                                {canComment && (
                                                    <div className="mini-comment-form">
                                                        <input 
                                                            type="text" 
                                                            placeholder="تعليق..."
                                                            value={commentInputs[tx.id] || ''}
                                                            onChange={(e) => setCommentInputs({...commentInputs, [tx.id]: e.target.value})}
                                                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment(tx.id)}
                                                        />
                                                        <button onClick={() => handleAddComment(tx.id)}><MdSend /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;
