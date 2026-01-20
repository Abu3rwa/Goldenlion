import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { selectCartItems, selectCartSubtotal, clearCart } from '../store/cartSlice';
import { fetchActiveCities } from '../store/deliveryCitiesSlice';
import { createPublicOrder } from '../store/publicOrdersSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents, toCents } from '../utils/decimalUtils';
import {
    MdPerson,
    MdPhone,
    MdLocationOn,
    MdReceipt,
    MdArrowBack,
    MdCheckCircle,
    MdLocalShipping,
    MdShoppingBag,
    MdRefresh
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import './CheckoutPage.css';

const CheckoutPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Selectors
    const cartItems = useSelector(selectCartItems);
    const subtotal = useSelector(selectCartSubtotal);
    const { cities, status: citiesStatus } = useSelector((state) => state.deliveryCities);
    const { currency, phone: companyPhone } = useSelector((state) => state.company);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cityId, setCityId] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState({});

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);

    // Load cities on mount
    useEffect(() => {
        dispatch(fetchActiveCities());
    }, [dispatch]);

    // Derived State
    const selectedCity = cities.find(c => c.id === cityId);
    const deliveryCharge = selectedCity ? selectedCity.deliveryCharge : 0;
    const total = subtotal + deliveryCharge;

    const validateForm = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = 'الاسم مطلوب';
        if (!phone.trim()) newErrors.phone = 'رقم الهاتف مطلوب';
        else if (!/^09\d{8}$/.test(phone.replace(/\D/g, ''))) newErrors.phone = 'الرقم يجب أن يبدأ بـ 09 ويتكون من 10 أرقام';
        if (!cityId) newErrors.cityId = 'المدينة مطلوبة';
        if (!address.trim()) newErrors.address = 'العنوان مطلوب';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        const orderData = {
            customerName: name,
            customerPhone: phone,
            customerAddress: address,
            customerNotes: notes,
            cityId: selectedCity.id,
            cityName: selectedCity.name,
            deliveryCharge,
            subtotal,
            total,
            items: cartItems
        };

        try {
            const resultAction = await dispatch(createPublicOrder(orderData));
            if (createPublicOrder.fulfilled.match(resultAction)) {
                const newOrder = resultAction.payload;
                setOrderSuccess(newOrder);
                dispatch(clearCart());
                window.scrollTo(0, 0);
            } else {
                alert('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('حدث خطأ غير متوقع.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWhatsAppConfirm = () => {
        if (!orderSuccess) return;

        const adminPhone = companyPhone || '218910000000';
        let message = `مرحباً، قمت بطلب جديد من الموقع.\n`;
        message += `رقم الطلب: ${orderSuccess.orderNumber}\n`;
        message += `الاسم: ${orderSuccess.customer.name}\n`;
        message += `الإجمالي: ${formatCurrency(fromCents(orderSuccess.total), currency)}\n\n`;
        message += `يرجى تأكيد الطلب. شكراً!`;

        window.open(`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // --- RENDER: Empty Cart ---
    if (cartItems.length === 0 && !orderSuccess) {
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

    // --- RENDER: Success ---
    if (orderSuccess) {
        return (
            <div className="checkout-page">
                <div className="checkout-container success-container">
                    <MdCheckCircle className="success-icon" />
                    <h1>تم استلام طلبك بنجاح!</h1>
                    <p>شكراً لتسوقك معنا. سنقوم بمعالجة طلبك في أقرب وقت.</p>

                    <div className="order-number-box">
                        <span>رقم الطلب المرجعي</span>
                        <span className="order-number">{orderSuccess.orderNumber}</span>
                    </div>

                    <div className="success-actions">
                        <button onClick={handleWhatsAppConfirm} className="whatsapp-confirm-btn">
                            <FaWhatsapp size={20} />
                            تأكيد الطلب عبر واتساب
                        </button>
                        <Link to="/store" className="btn btn-outline-primary">
                            متابعة التسوق
                        </Link>
                    </div>
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
                                    <div key={item.productId} className="summary-item">
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
