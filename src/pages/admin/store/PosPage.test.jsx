import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PosPage from './PosPage';
import { publicProductService } from '../../../services/publicProductService';
import { publicOrderService } from '../../../services/publicOrderService';

vi.mock('../../../services/userService', () => ({
    userService: {
        canPerformAction: vi.fn((roles, action) => action === 'USE_POS'),
    },
}));

vi.mock('../../../services/publicProductService', () => ({
    publicProductService: {
        getPosCatalogAudit: vi.fn(),
        getProductByScanValue: vi.fn(),
    },
}));

vi.mock('../../../services/publicOrderService', () => ({
    publicOrderService: {
        createPosSale: vi.fn(),
    },
}));

const createStore = () => configureStore({
    reducer: {
        auth: (state = { userProfile: { roles: ['sales_manager'] } }) => state,
        company: (state = { currency: 'د.ل' }) => state,
    },
});

describe('PosPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        publicProductService.getPosCatalogAudit.mockResolvedValue({
            ready: true,
            totalProducts: 1,
            readyProducts: 1,
            missingCodes: [],
            duplicateCodes: [],
        });

        publicProductService.getProductByScanValue.mockResolvedValue({
            id: 'p-1',
            code: 'BAG-001',
            name: 'شنطة عملية',
            price: 1500,
            images: [],
            colorVariants: [],
            inStock: true,
            totalStock: 4,
        });

        publicOrderService.createPosSale.mockResolvedValue({
            orderNumber: 'POS-20260311-ABC123',
            total: 1500,
            customer: { name: 'عميل مباشر' },
            items: [
                {
                    productId: 'p-1',
                    productName: 'شنطة عملية',
                    quantity: 1,
                    price: 1500,
                },
            ],
        });
    });

    it('adds a product by code and completes a cash sale', async () => {
        const user = userEvent.setup();

        render(
            <Provider store={createStore()}>
                <PosPage />
            </Provider>
        );

        await waitFor(() => {
            expect(publicProductService.getPosCatalogAudit).toHaveBeenCalled();
        });

        await user.type(screen.getByLabelText(/أدخل كود المنتج/i), 'bag-001');
        await user.click(screen.getByRole('button', { name: /إضافة/i }));

        await waitFor(() => {
            expect(screen.getByText('شنطة عملية')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /إتمام البيع/i }));

        await waitFor(() => {
            expect(publicOrderService.createPosSale).toHaveBeenCalledWith({
                customerName: '',
                customerPhone: '',
                notes: '',
                items: [
                    {
                        productId: 'p-1',
                        quantity: 1,
                        selectedColor: null,
                    },
                ],
            });
        });

        expect(screen.getByText(/POS-20260311-ABC123/i)).toBeInTheDocument();
        expect(screen.getByText(/إيصال العملية/i)).toBeInTheDocument();
    }, 15000);
});
