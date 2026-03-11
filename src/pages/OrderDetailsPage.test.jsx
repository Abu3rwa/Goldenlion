import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import OrderDetailsPage from './OrderDetailsPage';
import { publicOrderService } from '../services/publicOrderService';

vi.mock('../services/publicOrderService', () => ({
    publicOrderService: {
        getOrderById: vi.fn(),
        getPublicOrderTracking: vi.fn(),
    },
}));

const createStore = () => configureStore({
    reducer: {
        company: (state = {
            currency: 'د.ل',
            phone: '218931169753',
            companyName: 'مجمـوعة الأسـد',
        }) => state,
    },
});

describe('OrderDetailsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.scrollTo = vi.fn();

        publicOrderService.getPublicOrderTracking.mockResolvedValue({
            orderNumber: 'GL-20260311-ABCD',
            createdAt: '2026-03-11T10:00:00.000Z',
            status: 'pending',
            cityName: 'طرابلس',
            subtotal: 10000,
            deliveryCharge: 2000,
            total: 12000,
            paymentStatus: 'unpaid',
            items: [
                {
                    productId: 'p-1',
                    productName: 'شنطة',
                    quantity: 1,
                    price: 10000,
                    subtotal: 10000,
                    image: '',
                    selectedColor: null,
                },
            ],
        });
    });

    it('renders fetched order details', async () => {
        const store = createStore();

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/orders/GL-20260311-ABCD']}>
                    <Routes>
                        <Route path="/orders/:orderRef" element={<OrderDetailsPage />} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        await waitFor(() => {
            expect(publicOrderService.getPublicOrderTracking).toHaveBeenCalledWith('GL-20260311-ABCD');
        });

        const orderNumbers = await screen.findAllByText('GL-20260311-ABCD');
        expect(orderNumbers.length).toBeGreaterThan(0);
        expect(screen.getByText('ملخص التوصيل')).toBeInTheDocument();
        expect(screen.getByText('الملخص المالي')).toBeInTheDocument();
        expect(screen.getByText('شنطة')).toBeInTheDocument();
    });

    it('shows not-found state cleanly when order number is unknown', async () => {
        publicOrderService.getPublicOrderTracking.mockResolvedValueOnce(null);
        const store = createStore();

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/orders/GL-UNKNOWN']}>
                    <Routes>
                        <Route path="/orders/:orderRef" element={<OrderDetailsPage />} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        expect(await screen.findByText('الطلب غير موجود')).toBeInTheDocument();
    });
});
