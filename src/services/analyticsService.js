import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseConfig';

const functions = getFunctions(app, 'us-central1');

const getAnalyticsOverviewFn = httpsCallable(functions, 'getAnalyticsOverview');
const getAnalyticsTimeHeatmapFn = httpsCallable(functions, 'getAnalyticsTimeHeatmap');
const getAnalyticsProductPerformanceFn = httpsCallable(functions, 'getAnalyticsProductPerformance');
const getAnalyticsCityBreakdownFn = httpsCallable(functions, 'getAnalyticsCityBreakdown');
const getAnalyticsProductTimeSliceFn = httpsCallable(functions, 'getAnalyticsProductTimeSlice');
const backfillAnalyticsDataFn = httpsCallable(functions, 'backfillAnalyticsData');

const extractSummary = (result, fallbackMessage) => {
    const payload = result?.data || {};
    if (!payload.ok || !payload.summary) {
        throw new Error(fallbackMessage);
    }
    return payload.summary;
};

export const analyticsService = {
    getOverview: async (filters = {}) => {
        const result = await getAnalyticsOverviewFn(filters);
        return extractSummary(result, 'تعذر تحميل ملخص التحليلات.');
    },

    getTimeHeatmap: async (filters = {}) => {
        const result = await getAnalyticsTimeHeatmapFn(filters);
        return extractSummary(result, 'تعذر تحميل خريطة أوقات البيع.');
    },

    getProductPerformance: async (filters = {}) => {
        const result = await getAnalyticsProductPerformanceFn(filters);
        return extractSummary(result, 'تعذر تحميل أداء المنتجات.');
    },

    getCityBreakdown: async (filters = {}) => {
        const result = await getAnalyticsCityBreakdownFn(filters);
        return extractSummary(result, 'تعذر تحميل توزيع المدن.');
    },

    getProductTimeSlice: async (filters = {}) => {
        const result = await getAnalyticsProductTimeSliceFn(filters);
        return extractSummary(result, 'تعذر تحميل تحليل اليوم والوقت.');
    },

    backfillAnalytics: async () => {
        const result = await backfillAnalyticsDataFn({});
        const payload = result?.data || {};
        if (!payload.ok || !payload.result) {
            throw new Error('تعذر مزامنة بيانات التحليلات.');
        }
        return payload.result;
    },
};
