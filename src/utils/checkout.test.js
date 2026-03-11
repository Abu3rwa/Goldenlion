import { describe, expect, it } from 'vitest';
import {
    buildCheckoutOrderPayload,
    validateCheckoutForm,
} from './checkout';

describe('checkout utils', () => {
    it('builds order payload with normalized phone and coupon stub', () => {
        const payload = buildCheckoutOrderPayload({
            name: '  عميل تجريبي  ',
            phone: '09 1234 5678',
            address: ' شارع رئيسي ',
            notes: ' ملاحظة ',
            selectedCity: { id: 'tripoli', name: 'طرابلس' },
            deliveryCharge: 1500,
            subtotal: 5000,
            total: 6500,
            cartItems: [{ productId: 'p-1', quantity: 2, price: 2500 }],
            couponCode: ' golden10 ',
        });

        expect(payload.customerName).toBe('عميل تجريبي');
        expect(payload.customerPhone).toBe('0912345678');
        expect(payload.cityId).toBe('tripoli');
        expect(payload.total).toBe(6500);
        expect(payload.coupon).toEqual(
            expect.objectContaining({
                code: 'GOLDEN10',
                status: 'pending_validation',
            })
        );
    });

    it('returns field-level validation errors', () => {
        const errors = validateCheckoutForm({
            name: '',
            phone: '1234',
            cityId: '',
            address: '',
        });

        expect(errors).toEqual(
            expect.objectContaining({
                name: expect.any(String),
                phone: expect.any(String),
                cityId: expect.any(String),
                address: expect.any(String),
            })
        );
    });
});
