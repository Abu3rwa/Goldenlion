import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    MdArrowBack,
    MdCheckCircle,
    MdContentCopy,
    MdLocalShipping,
    MdLocationOn,
    MdOutlineInventory2,
    MdOutlinePayments,
    MdPerson,
    MdPhone,
    MdReceiptLong,
    MdRefresh,
    MdShoppingBag,
    MdStorefront,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { publicOrderService } from '../services/publicOrderService';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import './OrderDetailsPage.css';

const ORDER_STATUS_META = {
    pending: { label: 'قيد المراجعة', description: 'تم استلام الطلب وجارٍ مراجعته.' },
    confirmed: { label: 'تم التأكيد', description: 'تم تأكيد الطلب وبدء التجهيز.' },
    shipped: { label: 'تم الشحن', description: 'الطلب خرج للتوصيل.' },
    delivered: { label: 'تم التسليم', description: 'تم تسليم الطلب بنجاح.' },
    cancelled: { label: 'ملغي', description: 'تم إلغاء هذا الطلب.' },
};

const ORDER_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const formatOrderDate = (value) => {
    if (!value) return 'غير محدد';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'غير محدد';

    return parsed.toLocaleString('ar-LY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const OrderDetailsPage = () => {
    const { orderRef } = useParams();
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin/store/orders/');
    const normalizedOrderRef = decodeURIComponent(`${orderRef || ''}`.trim());
    const { currency, phone: companyPhone, companyName } = useSelector((state) => state.company);
    const [order, setOrder] = useState(() => {
        const stateOrder = location.state?.order;
        if (!stateOrder) return null;
        if (stateOrder?.id === normalizedOrderRef) return stateOrder;
        if (stateOrder?.orderNumber === normalizedOrderRef) return stateOrder;
        return null;
    });
    const [status, setStatus] = useState(order ? 'succeeded' : 'loading');
    const [error, setError] = useState('');
    const [copyFeedback, setCopyFeedback] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [normalizedOrderRef]);

    useEffect(() => {
        let isMounted = true;

        const loadOrder = async () => {
            const matchesCurrentOrder = order?.id === normalizedOrderRef || order?.orderNumber === normalizedOrderRef;
            setStatus((prev) => (matchesCurrentOrder ? prev : 'loading'));
            setError('');

            try {
                const response = isAdminRoute
                    ? await publicOrderService.getOrderById(normalizedOrderRef)
                    : await publicOrderService.getPublicOrderTracking(normalizedOrderRef);
                if (!isMounted) return;

                if (!response) {
                    setOrder(null);
                    setStatus('not_found');
                    return;
                }

                setOrder(response);
                setStatus('succeeded');
            } catch (loadError) {
                if (!isMounted) return;
                setStatus('failed');
                setError(loadError?.message || 'تعذر تحميل تفاصيل الطلب.');
            }
        };

        loadOrder();

        return () => {
            isMounted = false;
        };
    }, [isAdminRoute, normalizedOrderRef]);

    useEffect(() => {
        if (!copyFeedback) return undefined;

        const timeout = window.setTimeout(() => setCopyFeedback(''), 1800);
        return () => window.clearTimeout(timeout);
    }, [copyFeedback]);

    const statusMeta = ORDER_STATUS_META[order?.status] || ORDER_STATUS_META.pending;
    const currentStepIndex = order?.status === 'cancelled'
        ? -1
        : ORDER_STEPS.indexOf(order?.status || 'pending');
    const totalItems = useMemo(
        () => (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        [order]
    );

    const handleCopyOrderNumber = async () => {
        if (!order?.orderNumber || !navigator.clipboard) return;

        try {
            await navigator.clipboard.writeText(order.orderNumber);
            setCopyFeedback('تم نسخ رقم الطلب');
        } catch {
            setCopyFeedback('تعذر النسخ حالياً');
        }
    };

    const handleWhatsAppFollowUp = () => {
        if (!order?.orderNumber) return;

        const phoneNumber = companyPhone || '218931169753';
        const message = encodeURIComponent(
            `مرحباً، أحتاج متابعة الطلب ${order.orderNumber}. الحالة الحالية: ${statusMeta.label}.`
        );
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    if (status === 'loading') {
        return (
            <div className="order-details-page">
                <div className="order-details-shell">
                    <div className="order-state-card">
                        <div className="order-spinner"></div>
                        <h2>جاري تحميل تفاصيل الطلب</h2>
                        <p>نقوم بجلب بيانات الطلب الآن.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="order-details-page">
                <div className="order-details-shell">
                    <div className="order-state-card error">
                        <h2>تعذر تحميل الطلب</h2>
                        <p>{error || 'حدث خطأ غير متوقع.'}</p>
                        <div className="order-state-actions">
                            <button type="button" className="order-secondary-btn" onClick={() => window.location.reload()}>
                                <MdRefresh />
                                إعادة المحاولة
                            </button>
                            <Link to="/store" className="order-primary-btn">
                                <MdStorefront />
                                العودة للمتجر
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'not_found' || !order) {
        return (
            <div className="order-details-page">
                <div className="order-details-shell">
                    <div className="order-state-card">
                        <h2>الطلب غير موجود</h2>
                        <p>لم نتمكن من العثور على الطلب المطلوب بهذا الرابط.</p>
                        <div className="order-state-actions">
                            <Link to="/store" className="order-primary-btn">
                                <MdStorefront />
                                تصفح المنتجات
                            </Link>
                            <Link to="/checkout" className="order-secondary-btn">
                                <MdReceiptLong />
                                صفحة الدفع
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="order-details-page">
            <div className="order-details-shell">
                {location.state?.showSuccess ? (
                    <section className="order-success-banner">
                        <div>
                            <span className="order-success-kicker">تم استلام الطلب</span>
                            <h1>طلبك مسجل بنجاح وسيتم مراجعته قريباً.</h1>
                            <p>
                                احتفظ برقم الطلب وتابع حالته من هذه الصفحة في أي وقت.
                            </p>
                        </div>
                        <MdCheckCircle className="order-success-icon" />
                    </section>
                ) : null}

                <section className="order-hero-card">
                    <div className="order-hero-main">
                        <Link to="/store" className="order-back-link">
                            <MdArrowBack />
                            العودة للمتجر
                        </Link>
                        <span className="order-chip">تفاصيل الطلب</span>
                        <h2>{companyName || 'مجمـوعة الأسـد'}</h2>
                        <div className="order-reference-row">
                            <div>
                                <span className="order-reference-label">رقم الطلب</span>
                                <strong>{order.orderNumber}</strong>
                            </div>
                            <button type="button" className="order-copy-btn" onClick={handleCopyOrderNumber}>
                                <MdContentCopy />
                                نسخ الرقم
                            </button>
                        </div>
                        <p className="order-reference-help">
                            {copyFeedback || statusMeta.description}
                        </p>
                    </div>

                    <div className="order-hero-aside">
                        <div className={`order-status-pill status-${order.status || 'pending'}`}>
                            <MdLocalShipping />
                            {statusMeta.label}
                        </div>
                        <div className="order-hero-stat">
                            <span>تاريخ الطلب</span>
                            <strong>{formatOrderDate(order.createdAt)}</strong>
                        </div>
                        <div className="order-hero-stat">
                            <span>عدد القطع</span>
                            <strong>{totalItems}</strong>
                        </div>
                        <div className="order-hero-stat">
                            <span>الإجمالي</span>
                            <strong>{formatCurrency(fromCents(Number(order.total || 0)), currency)}</strong>
                        </div>
                    </div>
                </section>

                <section className="order-progress-card">
                    <div className="order-section-head">
                        <h3>حالة التنفيذ</h3>
                        <p>تحديثات الطلب حسب مرحلة المعالجة الحالية.</p>
                    </div>
                    <div className="order-progress-track" aria-label="مراحل الطلب">
                        {ORDER_STEPS.map((step, index) => {
                            const stepMeta = ORDER_STATUS_META[step];
                            const isActive = currentStepIndex >= index;
                            const isCurrent = order.status === step;

                            return (
                                <div
                                    key={step}
                                    className={`order-progress-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                                >
                                    <span className="order-progress-dot">{index + 1}</span>
                                    <strong>{stepMeta.label}</strong>
                                </div>
                            );
                        })}
                    </div>
                    {order.status === 'cancelled' ? (
                        <div className="order-cancelled-note">
                            هذا الطلب ملغي. إذا كان لديك استفسار بخصوص السبب أو إعادة الطلب، استخدم واتساب المباشر.
                        </div>
                    ) : null}
                </section>

                <div className="order-details-grid">
                    <section className="order-card order-items-card">
                        <div className="order-section-head">
                            <h3>المنتجات</h3>
                            <p>{totalItems} قطعة ضمن هذا الطلب.</p>
                        </div>

                        <div className="order-items-list">
                            {(order.items || []).map((item, index) => (
                                <article key={`${item.productId || item.productName}-${index}`} className="order-item-row">
                                    <div className="order-item-image-wrap">
                                        {item.image ? (
                                            <img src={item.image} alt={item.productName} className="order-item-image" />
                                        ) : (
                                            <div className="order-item-image order-item-image-fallback">
                                                <MdShoppingBag />
                                            </div>
                                        )}
                                    </div>
                                    <div className="order-item-copy">
                                        <h4>{item.productName || 'منتج'}</h4>
                                        <div className="order-item-meta">
                                            <span>الكمية: {item.quantity || 0}</span>
                                            {item.selectedColor?.color ? (
                                                <span>اللون: {item.selectedColor.color}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="order-item-price">
                                        <strong>
                                            {formatCurrency(fromCents(Number(item.subtotal || 0)), currency)}
                                        </strong>
                                        <span>
                                            {formatCurrency(fromCents(Number(item.price || 0)), currency)} / القطعة
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="order-side-column">
                        {isAdminRoute ? (
                            <article className="order-card">
                                <div className="order-section-head">
                                    <h3>بيانات العميل</h3>
                                    <p>المعلومات التي تم اعتمادها عند إنشاء الطلب.</p>
                                </div>

                                <div className="order-info-list">
                                    <div className="order-info-item">
                                        <MdPerson />
                                        <div>
                                            <span>الاسم</span>
                                            <strong>{order.customer?.name || 'غير محدد'}</strong>
                                        </div>
                                    </div>
                                    <div className="order-info-item">
                                        <MdPhone />
                                        <div>
                                            <span>الهاتف</span>
                                            <strong dir="ltr">{order.customer?.phone || 'غير محدد'}</strong>
                                        </div>
                                    </div>
                                    <div className="order-info-item">
                                        <MdLocationOn />
                                        <div>
                                            <span>العنوان</span>
                                            <strong>{order.customer?.address || 'غير محدد'}</strong>
                                        </div>
                                    </div>
                                    <div className="order-info-item">
                                        <MdLocalShipping />
                                        <div>
                                            <span>المدينة</span>
                                            <strong>{order.cityName || 'غير محدد'}</strong>
                                        </div>
                                    </div>
                                </div>

                                {order.customerNotes ? (
                                    <div className="order-note-block">
                                        <strong>ملاحظات العميل</strong>
                                        <p>{order.customerNotes}</p>
                                    </div>
                                ) : null}
                            </article>
                        ) : (
                            <article className="order-card">
                                <div className="order-section-head">
                                    <h3>ملخص التوصيل</h3>
                                    <p>معلومات الشحن المتاحة للمتابعة العامة.</p>
                                </div>
                                <div className="order-info-list">
                                    <div className="order-info-item">
                                        <MdLocalShipping />
                                        <div>
                                            <span>المدينة</span>
                                            <strong>{order.cityName || 'غير محدد'}</strong>
                                        </div>
                                    </div>
                                    <div className="order-info-item">
                                        <MdReceiptLong />
                                        <div>
                                            <span>رقم الطلب</span>
                                            <strong>{order.orderNumber || 'غير محدد'}</strong>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )}

                        <article className="order-card">
                            <div className="order-section-head">
                                <h3>الملخص المالي</h3>
                                <p>القيم المعتمدة في الطلب الحالي.</p>
                            </div>

                            <div className="order-summary-list">
                                <div className="order-summary-row">
                                    <span>المجموع الفرعي</span>
                                    <strong>{formatCurrency(fromCents(Number(order.subtotal || 0)), currency)}</strong>
                                </div>
                                <div className="order-summary-row">
                                    <span>رسوم التوصيل</span>
                                    <strong>{formatCurrency(fromCents(Number(order.deliveryCharge || 0)), currency)}</strong>
                                </div>
                                {order.coupon?.code ? (
                                    <div className="order-summary-row">
                                        <span>الكوبون</span>
                                        <strong dir="ltr">{order.coupon.code}</strong>
                                    </div>
                                ) : null}
                                <div className="order-summary-row">
                                    <span>الدفع</span>
                                    <strong>{order.paymentStatus === 'paid' ? 'مدفوع' : 'الدفع عند الاستلام'}</strong>
                                </div>
                                <div className="order-summary-row total">
                                    <span>الإجمالي الكلي</span>
                                    <strong>{formatCurrency(fromCents(Number(order.total || 0)), currency)}</strong>
                                </div>
                            </div>
                        </article>

                        <article className="order-card order-actions-card">
                            <div className="order-section-head">
                                <h3>إجراءات سريعة</h3>
                                <p>للمتابعة أو الطلب مرة أخرى.</p>
                            </div>

                            <div className="order-actions-stack">
                                <button type="button" className="order-primary-btn" onClick={handleWhatsAppFollowUp}>
                                    <FaWhatsapp />
                                    متابعة عبر واتساب
                                </button>
                                <Link to="/store" className="order-secondary-btn">
                                    <MdOutlineInventory2 />
                                    متابعة التسوق
                                </Link>
                                <Link to="/checkout" className="order-secondary-btn">
                                    <MdOutlinePayments />
                                    صفحة الدفع
                                </Link>
                            </div>
                        </article>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsPage;
