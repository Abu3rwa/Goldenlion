import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchOrderStats } from '../../../store/publicOrdersSlice';
import { fetchPublicProducts } from '../../../store/publicProductsSlice';
import { fetchAllCities } from '../../../store/deliveryCitiesSlice';
import { formatCurrency } from '../../../utils/currency';
import { userService } from '../../../services/userService';
import {
    MdStorefront,
    MdShoppingCart,
    MdPendingActions,
    MdLocalShipping,
    MdCheckCircle,
    MdInventory,
    MdLocationCity,
    MdTrendingUp
} from 'react-icons/md';
import './StoreDashboard.css';

const StoreDashboard = () => {
    const dispatch = useDispatch();
    const { stats } = useSelector((state) => state.publicOrders);
    const { products } = useSelector((state) => state.publicProducts);
    const { cities } = useSelector((state) => state.deliveryCities);
    const { currency } = useSelector((state) => state.company);
    const { userProfile } = useSelector((state) => state.auth);

    const canManage = userService.canPerformAction(userProfile?.role, 'VIEW_STORE_DASHBOARD');

    useEffect(() => {
        if (canManage) {
            dispatch(fetchOrderStats());
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
                                    <div className="stat-value">{formatCurrency(stats?.totalRevenue || 0, currency)}</div>
                                    <div className="stat-label">إجمالي المبيعات</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <Link to="/admin/store/products" className="text-decoration-none">
                        <div className="card border-0 shadow-sm h-100 action-card">
                            <div className="card-body text-center py-4">
                                <MdInventory className="fs-1 text-gold mb-2" />
                                <h5 className="mb-1">منتجات المتجر</h5>
                                <p className="text-muted small mb-0">
                                    {inStockProducts} متوفر من {products.length} منتج
                                    {featuredProducts > 0 && ` • ${featuredProducts} مميز`}
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link to="/admin/store/orders" className="text-decoration-none">
                        <div className="card border-0 shadow-sm h-100 action-card">
                            <div className="card-body text-center py-4">
                                <MdShoppingCart className="fs-1 text-gold mb-2" />
                                <h5 className="mb-1">إدارة الطلبات</h5>
                                <p className="text-muted small mb-0">
                                    {stats?.total || 0} طلب إجمالي
                                    {stats?.pending > 0 && <span className="badge bg-warning ms-2">{stats.pending} جديد</span>}
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link to="/admin/store/cities" className="text-decoration-none">
                        <div className="card border-0 shadow-sm h-100 action-card">
                            <div className="card-body text-center py-4">
                                <MdLocationCity className="fs-1 text-gold mb-2" />
                                <h5 className="mb-1">مدن التوصيل</h5>
                                <p className="text-muted small mb-0">
                                    {activeCities} مدينة مفعلة من {cities.length}
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
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
                    {!stats?.total ? (
                        <div className="text-center py-5 text-muted">
                            <MdShoppingCart className="fs-1 mb-2 opacity-25" />
                            <p>لا توجد طلبات حتى الآن</p>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted">
                            <p className="mb-0">اضغط على "عرض الكل" لرؤية تفاصيل الطلبات</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreDashboard;
