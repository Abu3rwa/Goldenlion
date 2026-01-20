import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchPublicOrders, updateOrderStatus } from '../../../store/publicOrdersSlice';
import { formatCurrency } from '../../../utils/currency';
import { fromCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import { ORDER_STATUS } from '../../../utils/constants';
import {
    MdShoppingCart,
    MdPendingActions,
    MdCheckCircle,
    MdLocalShipping,
    MdCancel,
    MdVisibility,
    MdPhone
} from 'react-icons/md';

const getStatusBadge = (status) => {
    const badges = {
        pending: { class: 'bg-warning text-dark', label: 'معلق', icon: <MdPendingActions /> },
        confirmed: { class: 'bg-info', label: 'مؤكد', icon: <MdCheckCircle /> },
        shipped: { class: 'bg-primary', label: 'قيد التوصيل', icon: <MdLocalShipping /> },
        delivered: { class: 'bg-success', label: 'تم التوصيل', icon: <MdCheckCircle /> },
        cancelled: { class: 'bg-danger', label: 'ملغي', icon: <MdCancel /> },
    };
    return badges[status] || badges.pending;
};

const StoreOrders = () => {
    const dispatch = useDispatch();
    const { orders, status } = useSelector((state) => state.publicOrders);
    const { currency } = useSelector((state) => state.company);
    const { userProfile } = useSelector((state) => state.auth);

    const [filterStatus, setFilterStatus] = useState('all');

    // Get roles array from profile
    const roles = userProfile?.roles || [];
    const canManage = userService.canPerformAction(roles, 'MANAGE_PUBLIC_ORDERS');

    useEffect(() => {
        if (canManage) {
            dispatch(fetchPublicOrders());
        }
    }, [dispatch, canManage]);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await dispatch(updateOrderStatus({ id: orderId, status: newStatus })).unwrap();
        } catch (err) {
            alert('فشل تحديث الحالة: ' + err.message);
        }
    };

    const filteredOrders = orders.filter(o => {
        if (filterStatus === 'all') return true;
        return o.status === filterStatus;
    });

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ar-LY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!canManage) {
        return (
            <div className="text-center py-5">
                <h3>غير مصرح لك بالوصول إلى هذه الصفحة</h3>
            </div>
        );
    }

    if (status === 'loading') {
        return <div className="text-center py-5"><div className="spinner-border text-gold"></div></div>;
    }

    return (
        <div className="store-orders-page">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <h1 className="h3 mb-0 d-flex align-items-center gap-2">
                    <MdShoppingCart className="text-gold" /> إدارة الطلبات
                </h1>
            </div>

            {/* Filters */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
                <button
                    className={`btn btn-sm ${filterStatus === 'all' ? 'btn-gold' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus('all')}
                >
                    الكل ({orders.length})
                </button>
                <button
                    className={`btn btn-sm ${filterStatus === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setFilterStatus('pending')}
                >
                    معلق ({orders.filter(o => o.status === 'pending').length})
                </button>
                <button
                    className={`btn btn-sm ${filterStatus === 'confirmed' ? 'btn-info text-white' : 'btn-outline-info'}`}
                    onClick={() => setFilterStatus('confirmed')}
                >
                    مؤكد ({orders.filter(o => o.status === 'confirmed').length})
                </button>
                <button
                    className={`btn btn-sm ${filterStatus === 'shipped' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilterStatus('shipped')}
                >
                    قيد التوصيل ({orders.filter(o => o.status === 'shipped').length})
                </button>
                <button
                    className={`btn btn-sm ${filterStatus === 'delivered' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setFilterStatus('delivered')}
                >
                    تم التوصيل ({orders.filter(o => o.status === 'delivered').length})
                </button>
            </div>

            {/* Orders List */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <MdShoppingCart className="fs-1 mb-3 opacity-25" />
                            <p>لا توجد طلبات</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>رقم الطلب</th>
                                        <th>العميل</th>
                                        <th>المدينة</th>
                                        <th>المنتجات</th>
                                        <th>الإجمالي</th>
                                        <th>الحالة</th>
                                        <th>التاريخ</th>
                                        <th className="text-end">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const statusInfo = getStatusBadge(order.status);
                                        return (
                                            <tr key={order.id}>
                                                <td>
                                                    <code className="fw-bold">{order.orderNumber}</code>
                                                </td>
                                                <td>
                                                    <div className="fw-bold">{order.customer?.name}</div>
                                                    <small className="text-muted d-flex align-items-center gap-1">
                                                        <MdPhone size={12} /> {order.customer?.phone}
                                                    </small>
                                                </td>
                                                <td>{order.cityName}</td>
                                                <td>
                                                    <span className="badge bg-secondary">
                                                        {order.items?.length || 0} منتج
                                                    </span>
                                                </td>
                                                <td className="fw-bold text-gold">
                                                    {formatCurrency(fromCents(order.total), currency)}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusInfo.class}`}>
                                                        {statusInfo.icon} {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <small>{formatDate(order.createdAt)}</small>
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-flex gap-1 justify-content-end">
                                                        {/* Status change dropdown */}
                                                        <select
                                                            className="form-select form-select-sm"
                                                            style={{ width: 'auto' }}
                                                            value={order.status}
                                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        >
                                                            <option value="pending">معلق</option>
                                                            <option value="confirmed">مؤكد</option>
                                                            <option value="shipped">قيد التوصيل</option>
                                                            <option value="delivered">تم التوصيل</option>
                                                            <option value="cancelled">ملغي</option>
                                                        </select>
                                                        <Link
                                                            to={`/admin/store/orders/${order.id}`}
                                                            className="btn btn-sm btn-outline-primary"
                                                            title="تفاصيل"
                                                        >
                                                            <MdVisibility />
                                                        </Link>
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
            </div>
        </div>
    );
};

export default StoreOrders;
