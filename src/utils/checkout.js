export const validateCheckoutForm = ({ name, phone, cityId, address }) => {
    const errors = {};

    if (!`${name || ''}`.trim()) {
        errors.name = 'الاسم مطلوب';
    }

    const normalizedPhone = `${phone || ''}`.replace(/\D/g, '');
    if (!normalizedPhone) {
        errors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^09\d{8}$/.test(normalizedPhone)) {
        errors.phone = 'الرقم يجب أن يبدأ بـ 09 ويتكون من 10 أرقام';
    }

    if (!cityId) {
        errors.cityId = 'المدينة مطلوبة';
    }

    if (!`${address || ''}`.trim()) {
        errors.address = 'العنوان مطلوب';
    }

    return errors;
};

export const normalizeCouponCode = (code) => {
    return `${code || ''}`.trim().toUpperCase();
};

export const buildCouponPayload = (couponCode) => {
    const normalizedCode = normalizeCouponCode(couponCode);
    if (!normalizedCode) return null;

    return {
        code: normalizedCode,
        status: 'pending_validation',
        discountAmount: 0,
        discountType: null,
        message: 'سيتم التحقق من الكوبون عند مراجعة الطلب',
    };
};

export const buildCheckoutOrderPayload = ({
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
}) => {
    if (!selectedCity?.id || !selectedCity?.name) {
        throw new Error('selectedCity is required');
    }

    return {
        customerName: `${name || ''}`.trim(),
        customerPhone: `${phone || ''}`.replace(/\D/g, ''),
        customerAddress: `${address || ''}`.trim(),
        customerNotes: `${notes || ''}`.trim(),
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        deliveryCharge: Number(deliveryCharge || 0),
        subtotal: Number(subtotal || 0),
        total: Number(total || 0),
        items: cartItems,
        coupon: buildCouponPayload(couponCode),
    };
};
