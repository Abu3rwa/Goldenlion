import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
    clearCart,
    revalidateCartItems,
    selectCartInventoryNotice,
    selectCartItems,
    selectCartSubtotal,
} from '../store/cartSlice';
import { fetchActiveCities } from '../store/deliveryCitiesSlice';
import { createPublicOrder } from '../store/publicOrdersSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import {
    buildCheckoutOrderPayload,
    normalizeCouponCode,
    validateCheckoutForm,
} from '../utils/checkout';
import {
    MdPerson,
    MdPhone,
    MdLocationOn,
    MdReceipt,
    MdArrowBack,
    MdLocalShipping,
    MdShoppingBag,
    MdRefresh,
    MdDiscount
} from 'react-icons/md';
import './CheckoutPage.css';

const CheckoutPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Selectors
    const cartItems = useSelector(selectCartItems);
    const subtotal = useSelector(selectCartSubtotal);
    const cartInventoryNotice = useSelector(selectCartInventoryNotice);
    const { cities, status: citiesStatus } = useSelector((state) => state.deliveryCities);
    const { currency } = useSelector((state) => state.company);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cityId, setCityId] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Load cities on mount
    useEffect(() => {
        dispatch(fetchActiveCities());
        dispatch(revalidateCartItems());
    }, [dispatch]);

    // Derived State
    const selectedCity = cities.find(c => c.id === cityId);
    const deliveryCharge = selectedCity ? selectedCity.deliveryCharge : 0;
    const total = subtotal + deliveryCharge;

    const validateForm = () => {
        const validationErrors = validateCheckoutForm({ name, phone, cityId, address });

        const normalizedCoupon = normalizeCouponCode(couponCode);
        if (normalizedCoupon && normalizedCoupon.length < 3) {
            validationErrors.couponCode = 'الحد الأدنى لطول الكوبون هو 3 أحرف';
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const revalidateAction = await dispatch(revalidateCartItems());
        const inventoryResult = revalidateAction.payload || {};
        if (inventoryResult.changed) {
            setGeneralError(inventoryResult.message || 'تم تحديث السلة حسب المخزون الحالي. راجع الكميات ثم أعد المحاولة.');
            return;
        }

        if (!validateForm()) return;

        setIsSubmitting(true);
        setGeneralError('');

        const orderData = buildCheckoutOrderPayload({
            name,
            phone,
            address,
            notes,
            selectedCity,
            deliveryCharge,
            subtotal,
            total,
            cartItems,
            couponCode,
        });

        try {
            const resultAction = await dispatch(createPublicOrder(orderData));
            if (createPublicOrder.fulfilled.match(resultAction)) {
                const newOrder = resultAction.payload;
                dispatch(clearCart());
                navigate(`/orders/${encodeURIComponent(newOrder.orderNumber)}`, {
                    replace: true,
                    state: {
                        order: newOrder,
                        showSuccess: true,
                    },
                });
            } else {
                const errorCode = resultAction?.error?.code || '';
                if (errorCode.includes('failed-precondition')) {
                    setGeneralError(resultAction?.error?.message || 'فشل إتمام الطلب بسبب تغير المخزون.');
                } else {
                    setGeneralError('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
                }
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setGeneralError('حدث خطأ غير متوقع أثناء إنشاء الطلب.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER: Empty Cart ---
    if (cartItems.length === 0) {
        return (
            <div className="checkout-page">
                <div className="checkout-container empty-cart-container">
                    <MdShoppingBag className="empty-icon" />
                    <h2>سلة التسوق فارغة</h2>
                    <p>أضف بعض المنتجات أولاً لإتمام الطلب</p>
                    <Link to="/store" className="btn btn-gold mt-3">
                        <MdArrowBack /> العودة للمتجر
                    </Link>
                </div>
            </div>
        );
    }

    // --- RENDER: Checkout Form ---
    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <div className="checkout-title">
                    <MdReceipt />
                    <h1>إتمام الطلب</h1>
                </div>

                <form onSubmit={handleSubmit} className="checkout-grid">
                    {/* Right Column: Forms */}
                    <div className="checkout-forms">
                        {generalError && (
                            <div className="checkout-card">
                                <div className="text-danger fw-bold">{generalError}</div>
                            </div>
                        )}
                        {cartInventoryNotice && (
                            <div className="checkout-card">
                                <div className="text-warning fw-bold">{cartInventoryNotice}</div>
                            </div>
                        )}

                        {/* Customer Details */}
                        <div className="checkout-card">
                            <div className="card-header-title">
                                <MdPerson /> بيانات العميل
                            </div>
                            <div className="form-group">
                                <label className="form-label">الاسم الكامل *</label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="أدخل اسمك الثلاثي"
                                />
                                {errors.name && <small className="text-danger">{errors.name}</small>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">رقم الهاتف *</label>
                                <input
                                    type="tel"
                                    dir="ltr"
                                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="09XXXXXXXX"
                                />
                                {errors.phone && <small className="text-danger">{errors.phone}</small>}
                            </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="checkout-card">
                            <div className="card-header-title">
                                <MdLocationOn /> بيانات التوصيل
                            </div>
                            <div className="form-group">
                                <label className="form-label">المدينة *</label>
                                {citiesStatus === 'loading' ? (
                                    <div className="text-muted small">جاري تحميل المدن...</div>
                                ) : (
                                    <>
                                        <select
                                            className={`form-select ${errors.cityId ? 'is-invalid' : ''}`}
                                            value={cityId}
                                            onChange={(e) => setCityId(e.target.value)}
                                            disabled={citiesStatus === 'loading' || cities.length === 0}
                                        >
                                            <option value="">-- اختر المدينة --</option>
                                            {cities.length > 0 ? (
                                                cities.map(city => (
                                                    <option key={city.id} value={city.id}>
                                                        {city.name} - {formatCurrency(fromCents(city.deliveryCharge), currency)}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>لا توجد مدن متاحة</option>
                                            )}
                                        </select>
                                        {errors.cityId && <small className="text-danger">{errors.cityId}</small>}

                                        {cities.length === 0 && citiesStatus === 'succeeded' && (
                                            <div className="mt-2 text-danger small">
                                                <p className="mb-1">لم يتم العثور على مدن.</p>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => dispatch(fetchActiveCities())}
                                                >
                                                    <MdRefresh /> إعادة المحاولة
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">العنوان بالتفصيل *</label>
                                <textarea
                                    className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                                    rows="3"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="اسم الشارع، رقم المنزل، أقرب نقطة دالة..."
                                ></textarea>
                                {errors.address && <small className="text-danger">{errors.address}</small>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">ملاحظات إضافية (اختياري)</label>
                                <textarea
                                    className="form-control"
                                    rows="2"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="أي تعليمات خاصة للتوصيل..."
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">كوبون خصم (اختياري)</label>
                                <div className="coupon-input-wrap">
                                    <MdDiscount />
                                    <input
                                        type="text"
                                        className={`form-control ${errors.couponCode ? 'is-invalid' : ''}`}
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        placeholder="مثال: GOLDEN10"
                                        dir="ltr"
                                    />
                                </div>
                                {errors.couponCode ? (
                                    <small className="text-danger">{errors.couponCode}</small>
                                ) : couponCode.trim() ? (
                                    <small className="text-muted">
                                        سيتم التحقق من الكوبون عند مراجعة الطلب.
                                    </small>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Left Column: Summary */}
                    <div className="checkout-summary">
                        <div className="checkout-card order-summary">
                            <div className="card-header-title">
                                <MdShoppingBag /> ملخص الطلب
                            </div>

                            <div className="summary-items">
                                {cartItems.map((item) => (
                                    <div key={item.cartKey || item.productId} className="summary-item">
                                        <div className="summary-item-img-wrapper">
                                            {item.image ? (
                                                <img src={item.image} alt={item.productName} className="summary-item-img" />
                                            ) : (
                                                <div className="summary-item-img d-flex align-items-center justify-content-center text-muted">
                                                    <MdShoppingBag />
                                                </div>
                                            )}
                                        </div>
                                        <div className="summary-item-details">
                                            <div className="summary-item-name">{item.productName}</div>
                                            <div className="summary-item-meta">
                                                {item.quantity} x {formatCurrency(fromCents(item.price), currency)}
                                            </div>
                                            {item.selectedColor && (
                                                <div className="summary-item-color">
                                                    اللون: {item.selectedColor.color}
                                                </div>
                                            )}
                                        </div>
                                        <div className="summary-item-total fw-bold">
                                            {formatCurrency(fromCents(item.price * item.quantity), currency)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-totals">
                                <div className="summary-row">
                                    <span>المجموع الفرعي</span>
                                    <span>{formatCurrency(fromCents(subtotal), currency)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>عدد المنتجات</span>
                                    <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                </div>
                                {couponCode.trim() && (
                                    <div className="summary-row">
                                        <span>الكوبون</span>
                                        <span dir="ltr">{normalizeCouponCode(couponCode)}</span>
                                    </div>
                                )}
                                <div className="summary-row">
                                    <span className="d-flex align-items-center gap-1">
                                        <MdLocalShipping /> رسوم التوصيل
                                    </span>
                                    <span>
                                        {cityId ? formatCurrency(fromCents(deliveryCharge), currency) : '--'}
                                    </span>
                                </div>
                                <div className="summary-row total">
                                    <span>الإجمالي الكلي</span>
                                    <span className="text-gold">{formatCurrency(fromCents(total), currency)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="checkout-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'جاري المعالجة...' : 'تأكيد الطلب'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutPage;
