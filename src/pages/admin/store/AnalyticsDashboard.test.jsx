import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsDashboard from './AnalyticsDashboard';
import { analyticsService } from '../../../services/analyticsService';
import { publicCategoryService } from '../../../services/publicCategoryService';
import { publicProductService } from '../../../services/publicProductService';

vi.mock('../../../services/userService', () => ({
    userService: {
        canPerformAction: vi.fn((roles, action) => action === 'VIEW_ADVANCED_ANALYTICS'),
    },
}));

vi.mock('../../../services/analyticsService', () => ({
    analyticsService: {
        getOverview: vi.fn(),
        getTimeHeatmap: vi.fn(),
        getProductPerformance: vi.fn(),
        getCityBreakdown: vi.fn(),
        getProductTimeSlice: vi.fn(),
        backfillAnalytics: vi.fn(),
    },
}));

vi.mock('../../../services/publicCategoryService', () => ({
    publicCategoryService: {
        getAllCategories: vi.fn(),
    },
}));

vi.mock('../../../services/publicProductService', () => ({
    publicProductService: {
        getAllProducts: vi.fn(),
    },
}));

const createStore = () => configureStore({
    reducer: {
        auth: (state = { userProfile: { roles: ['owner'] } }) => state,
        company: (state = { currency: 'د.ل' }) => state,
    },
});

const buildHeatmapMatrix = () => Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    hours: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        units: weekday === 2 && hour === 18 ? 5 : 0,
        revenue: weekday === 2 && hour === 18 ? 5000 : 0,
    })),
}));

describe('AnalyticsDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        publicCategoryService.getAllCategories.mockResolvedValue([
            { id: 'bags', name: 'شنط' },
        ]);

        publicProductService.getAllProducts.mockResolvedValue([
            { id: 'p-1', name: 'شنطة عملية', categoryId: 'bags' },
        ]);

        analyticsService.getOverview.mockResolvedValue({
            totals: {
                deliveredRevenue: 12000,
                deliveredProfit: 4200,
                placedUnits: 8,
                cancellationRate: 0.125,
            },
            stockIntelligence: {
                reorderNeeded: [
                    { productId: 'p-1', productName: 'شنطة عملية', recommendedReorderQty: 4, confidence: 'medium' },
                ],
                likelyStockouts: [
                    { productId: 'p-1', productName: 'شنطة عملية', predictedStockoutDate: '2026-03-20', totalStock: 2 },
                ],
            },
        });

        analyticsService.getTimeHeatmap.mockResolvedValue({
            matrix: buildHeatmapMatrix(),
        });

        analyticsService.getProductPerformance.mockResolvedValue({
            topByUnits: [{ productId: 'p-1', productName: 'شنطة عملية', productCode: 'BAG-001', placedUnits: 8 }],
            topByRevenue: [{ productId: 'p-1', productName: 'شنطة عملية', productCode: 'BAG-001', deliveredRevenue: 12000 }],
            topByProfit: [{ productId: 'p-1', productName: 'شنطة عملية', productCode: 'BAG-001', deliveredProfit: 4200 }],
            risingProducts: [{ productId: 'p-1', productName: 'شنطة عملية', productCode: 'BAG-001', growthDelta: 3 }],
            fallingProducts: [{ productId: 'p-2', productName: 'محفظة جلد', productCode: 'WAL-002', growthDelta: -1 }],
            slowMovers: [{ productId: 'p-3', productName: 'حزام', productCode: 'BEL-003', placedUnits: 1 }],
            stockIntelligence: {
                deadStock: [{ productId: 'p-4', productName: 'تيجان', productCode: 'CRN-004', totalStock: 6 }],
            },
        });

        analyticsService.getCityBreakdown.mockResolvedValue({
            cities: [
                {
                    cityId: 'tripoli',
                    cityName: 'طرابلس',
                    deliveredRevenue: 12000,
                    topProducts: [{ productId: 'p-1', productName: 'شنطة عملية' }],
                },
            ],
        });

        analyticsService.getProductTimeSlice.mockResolvedValue({
            weekdayBuckets: Array.from({ length: 7 }, (_, weekday) => ({ weekday, units: weekday === 2 ? 5 : 0, revenue: 0 })),
            topProducts: [{ productId: 'p-1', productName: 'شنطة عملية', productCode: 'BAG-001', placedUnits: 8 }],
        });

        analyticsService.backfillAnalytics.mockResolvedValue({ orders: 1 });
    });

    it('loads analytics cards and allows manual sync', async () => {
        const user = userEvent.setup();

        render(
            <Provider store={createStore()}>
                <AnalyticsDashboard />
            </Provider>
        );

        await waitFor(() => {
            expect(analyticsService.getOverview).toHaveBeenCalled();
        });

        expect(screen.getByText(/لوحة التحليلات المتقدمة/i)).toBeInTheDocument();
        expect(screen.getAllByText(/شنطة عملية/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/أفضل المدن/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /مزامنة التحليلات/i }));

        await waitFor(() => {
            expect(analyticsService.backfillAnalytics).toHaveBeenCalled();
        });
    }, 15000);
});
