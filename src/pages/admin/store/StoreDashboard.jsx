import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchOrderStats, fetchPublicOrders } from '../../../store/publicOrdersSlice';
import { fetchPublicProducts } from '../../../store/publicProductsSlice';
import { fetchAllCities } from '../../../store/deliveryCitiesSlice';
import { formatCurrency } from '../../../utils/currency';
import { fromCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import {
    MdStorefront,
    MdShoppingCart,
    MdPendingActions,
    MdLocalShipping,
    MdCheckCircle,
    MdInventory,
    MdLocationCity,
    MdTrendingUp,
    MdAccessTime,
    MdPointOfSale,
    MdAnalytics
} from 'react-icons/md';
import './StoreDashboard.css';

const StoreDashboard = () => {
    const dispatch = useDispatch();
    const { stats, orders } = useSelector((state) => state.publicOrders);
    const { products } = useSelector((state) => state.publicProducts);
    const { cities } = useSelector((state) => state.deliveryCities);
    const { currency } = useSelector((state) => state.company);
    const { userProfile } = useSelector((state) => state.auth);

    // Get roles array from profile
    const roles = userProfile?.roles || [];
    const canManage = userService.canPerformAction(roles, 'VIEW_STORE_DASHBOARD');
    const canUsePos = userService.canPerformAction(roles, 'USE_POS');
    const canViewAnalytics = userService.canPerformAction(roles, 'VIEW_ADVANCED_ANALYTICS');

    useEffect(() => {
        if (canManage) {
            dispatch(fetchOrderStats());
            dispatch(fetchPublicOrders());
            dispatch(fetchPublicProducts());
            dispatch(fetchAllCities());
        }
    }, [dispatch, canManage]);

    if (!canManage) {
        return (
            <div className="text-center py-5">
                <h3>غير مصرح لك بالوصول إلى هذه الصفحة</h3>
            </div>
        );
    }

    const inStockProducts = products.filter(p => p.inStock).length;
    const featuredProducts = products.filter(p => p.featured).length;
    const activeCities = cities.filter(c => c.isActive).length;
    const actionCards = [
        {
            key: 'products',
            to: '/admin/store/products',
            icon: <MdInventory className="fs-1 text-gold mb-2" />,
            title: 'منتجات المتجر',
            description: `${inStockProducts} متوفر من ${products.length} منتج${featuredProducts > 0 ? ` • ${featuredProducts} مميز` : ''}`,
        },
        {
            key: 'orders',
            to: '/admin/store/orders',
            icon: <MdShoppingCart className="fs-1 text-gold mb-2" />,
            title: 'إدارة الطلبات',
            description: `${stats?.total || 0} طلب إجمالي`,
            badge: stats?.pending > 0 ? `${stats.pending} جديد` : '',
        },
        {
            key: 'cities',
            to: '/admin/store/cities',
            icon: <MdLocationCity className="fs-1 text-gold mb-2" />,
            title: 'مدن التوصيل',
            description: `${activeCities} مدينة مفعلة من ${cities.length}`,
        },
    ];

    if (canUsePos) {
        actionCards.push({
            key: 'pos',
            to: '/admin/pos',
            icon: <MdPointOfSale className="fs-1 text-gold mb-2" />,
            title: 'نقطة البيع',
            description: 'بيع مباشر سريع باستخدام كود المنتج مع إيصال فوري.',
        });
    }

    if (canViewAnalytics) {
        actionCards.push({
            key: 'analytics',
            to: '/admin/analytics',
            icon: <MdAnalytics className="fs-1 text-gold mb-2" />,
            title: 'التحليلات المتقدمة',
            description: 'أفضل المنتجات، المدن، الأوقات، وتوقعات إعادة الطلب.',
        });
    }

    return (
        <div className="store-dashboard">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 mb-0 d-flex align-items-center gap-2">
                    <MdStorefront className="text-gold" /> لوحة تحكم المتجر
                </h1>
            </div>

            {/* Quick Stats */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-warning bg-opacity-10 text-warning">
                                    <MdPendingActions />
                                </div>
                                <div>
                                    <div className="stat-value">{stats?.pending || 0}</div>
                                    <div className="stat-label">طلبات معلقة</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-info bg-opacity-10 text-info">
                                    <MdLocalShipping />
                                </div>
                                <div>
                                    <div className="stat-value">{stats?.shipped || 0}</div>
                                    <div className="stat-label">قيد التوصيل</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-success bg-opacity-10 text-success">
                                    <MdCheckCircle />
                                </div>
                                <div>
                                    <div className="stat-value">{stats?.delivered || 0}</div>
                                    <div className="stat-label">تم التوصيل</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-gold bg-opacity-10 text-gold">
                                    <MdTrendingUp />
                                </div>
                                <div>
                                    <div className="stat-value">{formatCurrency(fromCents(stats?.totalRevenue || 0), currency)}</div>
                                    <div className="stat-label">إجمالي المبيعات</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profit Stats */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-success bg-opacity-10 text-success">
                                    <MdTrendingUp />
                                </div>
                                <div>
                                    <div className="stat-value text-success">{formatCurrency(fromCents(stats?.totalProfit || 0), currency)}</div>
                                    <div className="stat-label">صافي الربح</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-danger bg-opacity-10 text-danger">
                                    <MdShoppingCart />
                                </div>
                                <div>
                                    <div className="stat-value text-danger">{formatCurrency(fromCents(stats?.totalCost || 0), currency)}</div>
                                    <div className="stat-label">إجمالي التكاليف</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100 stat-card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="stat-icon bg-primary bg-opacity-10 text-primary">
                                    <MdShoppingCart />
                                </div>
                                <div>
                                    <div className="stat-value">{stats?.total || 0}</div>
                                    <div className="stat-label">إجمالي الطلبات</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="row g-3 mb-4">
                {actionCards.map((card) => (
                    <div key={card.key} className="col-md-6 col-xl-4">
                        <Link to={card.to} className="text-decoration-none">
                            <div className="card border-0 shadow-sm h-100 action-card">
                                <div className="card-body text-center py-4">
                                    {card.icon}
                                    <h5 className="mb-1">{card.title}</h5>
                                    <p className="text-muted small mb-0">
                                        {card.description}
                                        {card.badge ? <span className="badge bg-warning ms-2">{card.badge}</span> : null}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Recent Orders Preview */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold">آخر الطلبات</h5>
                    <Link to="/admin/store/orders" className="btn btn-sm btn-outline-gold">
                        عرض الكل
                    </Link>
                </div>
                <div className="card-body p-0">
                    {!orders || orders.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <MdShoppingCart className="fs-1 mb-2 opacity-25" />
                            <p>لا توجد طلبات حتى الآن</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>رقم الطلب</th>
                                        <th>العميل</th>
                                        <th>المبلغ</th>
                                        <th>الحالة</th>
                                        <th>التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.slice(0, 5).map((order) => {
                                        const statusColors = {
                                            pending: 'bg-warning-subtle text-warning',
                                            processing: 'bg-info-subtle text-info',
                                            shipped: 'bg-primary-subtle text-primary',
                                            delivered: 'bg-success-subtle text-success',
                                            cancelled: 'bg-danger-subtle text-danger'
                                        };
                                        const statusLabels = {
                                            pending: 'قيد الانتظار',
                                            processing: 'قيد التجهيز',
                                            shipped: 'تم الشحن',
                                            delivered: 'تم التوصيل',
                                            cancelled: 'ملغي'
                                        };
                                        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                                        return (
                                            <tr key={order.id}>
                                                <td className="fw-bold">#{order.orderNumber || order.id.slice(0, 6)}</td>
                                                <td>{order.customerName || order.customer?.name || 'غير محدد'}</td>
                                                <td className="fw-bold text-success">
                                                    {formatCurrency(fromCents(order.totalAmountCents || 0), currency)}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusColors[order.status] || 'bg-secondary'}`}>
                                                        {statusLabels[order.status] || order.status}
                                                    </span>
                                                </td>
                                                <td className="text-muted small">
                                                    <MdAccessTime className="me-1" />
                                                    {orderDate.toLocaleDateString('ar-LY', { month: 'short', day: 'numeric' })}
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

export default StoreDashboard;
