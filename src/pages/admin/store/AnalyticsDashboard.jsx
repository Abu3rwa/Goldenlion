import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { analyticsService } from '../../../services/analyticsService';
import { publicCategoryService } from '../../../services/publicCategoryService';
import { publicProductService } from '../../../services/publicProductService';
import { userService } from '../../../services/userService';
import { formatCurrency } from '../../../utils/currency';
import { fromCents } from '../../../utils/decimalUtils';
import {
    MdAnalytics,
    MdBarChart,
    MdCalendarToday,
    MdLocationCity,
    MdRefresh,
    MdShowChart,
    MdTrendingDown,
    MdTrendingUp,
    MdWarningAmber,
} from 'react-icons/md';
import './AnalyticsDashboard.css';

const WEEKDAY_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const defaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    const toKey = (date) => date.toISOString().slice(0, 10);
    return {
        startDate: toKey(start),
        endDate: toKey(end),
    };
};

const HeatCell = ({ value, max }) => {
    const opacity = max > 0 ? Math.max(0.12, value / max) : 0.08;
    return (
        <div
            className="heat-cell"
            style={{ background: `rgba(212, 175, 55, ${opacity})` }}
            title={`${value.toFixed(0)} وحدة`}
        >
            {value > 0 ? value.toFixed(0) : '-'}
        </div>
    );
};

const MetricTable = ({ title, rows, currency, metric = 'units', valueField = '' }) => (
    <section className="analytics-card">
        <div className="section-head">
            <h3>{title}</h3>
        </div>
        {rows?.length ? (
            <div className="analytics-table">
                {rows.map((row) => (
                    <div key={`${title}-${row.productId || row.cityId || row.productCode || row.productName}`}>
                        <span>
                            {row.productName || row.cityName}
                            {row.productCode ? <small dir="ltr">{row.productCode}</small> : null}
                        </span>
                        <strong>
                            {metric === 'currency'
                                ? formatCurrency(fromCents(row[valueField] ?? 0), currency)
                                : Number(row[valueField] ?? 0).toFixed(0)}
                        </strong>
                    </div>
                ))}
            </div>
        ) : (
            <div className="empty-state">لا توجد بيانات كافية.</div>
        )}
    </section>
);

const AnalyticsDashboard = () => {
    const { userProfile } = useSelector((state) => state.auth);
    const { currency } = useSelector((state) => state.company);
    const roles = userProfile?.roles || [];
    const canViewAnalytics = userService.canPerformAction(roles, 'VIEW_ADVANCED_ANALYTICS');

    const [filters, setFilters] = useState(() => ({
        ...defaultDateRange(),
        cityId: '',
        categoryId: '',
        productId: '',
    }));
    const [overview, setOverview] = useState(null);
    const [heatmap, setHeatmap] = useState(null);
    const [productPerformance, setProductPerformance] = useState(null);
    const [cityBreakdown, setCityBreakdown] = useState(null);
    const [productTimeSlice, setProductTimeSlice] = useState(null);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadStaticData = async () => {
            try {
                const [categoryRows, productRows] = await Promise.all([
                    publicCategoryService.getAllCategories(),
                    publicProductService.getAllProducts(),
                ]);
                if (!isMounted) return;
                setCategories(categoryRows || []);
                setProducts(productRows || []);
            } catch (loadError) {
                if (!isMounted) return;
                setError(loadError?.message || 'تعذر تحميل قوائم المنتجات والتصنيفات.');
            }
        };

        if (canViewAnalytics) {
            loadStaticData();
        }

        return () => {
            isMounted = false;
        };
    }, [canViewAnalytics]);

    useEffect(() => {
        let isMounted = true;

        const loadDashboard = async () => {
            if (!canViewAnalytics) return;
            setStatus('loading');
            setError('');

            try {
                const payload = {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    cityId: filters.cityId,
                    categoryId: filters.categoryId,
                    productId: filters.productId,
                    metricMode: 'placed',
                };

                const [
                    overviewSummary,
                    timeHeatmap,
                    performance,
                    citySummary,
                    productTime,
                ] = await Promise.all([
                    analyticsService.getOverview(payload),
                    analyticsService.getTimeHeatmap(payload),
                    analyticsService.getProductPerformance(payload),
                    analyticsService.getCityBreakdown(payload),
                    analyticsService.getProductTimeSlice(payload),
                ]);

                if (!isMounted) return;
                setOverview(overviewSummary);
                setHeatmap(timeHeatmap);
                setProductPerformance(performance);
                setCityBreakdown(citySummary);
                setProductTimeSlice(productTime);
                setStatus('succeeded');
            } catch (loadError) {
                if (!isMounted) return;
                setStatus('failed');
                setError(loadError?.message || 'تعذر تحميل لوحة التحليلات.');
            }
        };

        loadDashboard();
        return () => {
            isMounted = false;
        };
    }, [canViewAnalytics, filters]);

    const handleSync = async () => {
        setSyncing(true);
        setError('');
        try {
            await analyticsService.backfillAnalytics();
            setFilters((current) => ({ ...current }));
        } catch (syncError) {
            setError(syncError?.message || 'تعذر مزامنة التحليلات.');
        } finally {
            setSyncing(false);
        }
    };

    const heatmapMax = useMemo(() => {
        const values = (heatmap?.matrix || []).flatMap((day) => day.hours.map((hour) => hour.units));
        return Math.max(0, ...values);
    }, [heatmap]);

    if (!canViewAnalytics) {
        return (
            <div className="text-center py-5">
                <h3>غير مصرح لك بالوصول إلى التحليلات المتقدمة</h3>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <header className="analytics-hero">
                <div>
                    <p className="analytics-eyebrow">Owner Intelligence</p>
                    <h1><MdAnalytics /> لوحة التحليلات المتقدمة</h1>
                    <p>أداء المنتجات، أفضل أوقات البيع، توزيع المدن، والتنبيهات الاستباقية لإعادة الطلب.</p>
                </div>
                <div className="analytics-hero-actions">
                    <button type="button" className="btn btn-outline-light" onClick={handleSync} disabled={syncing}>
                        <MdRefresh /> {syncing ? 'جاري المزامنة...' : 'مزامنة التحليلات'}
                    </button>
                </div>
            </header>

            <section className="analytics-card filter-card">
                <div className="filter-grid">
                    <label>
                        من
                        <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
                    </label>
                    <label>
                        إلى
                        <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
                    </label>
                    <label>
                        المدينة
                        <select value={filters.cityId} onChange={(event) => setFilters((current) => ({ ...current, cityId: event.target.value }))}>
                            <option value="">كل المدن</option>
                            {(cityBreakdown?.cities || []).map((city) => (
                                <option key={city.cityId} value={city.cityId}>{city.cityName}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        التصنيف
                        <select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value, productId: '' }))}>
                            <option value="">كل التصنيفات</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        المنتج
                        <select value={filters.productId} onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}>
                            <option value="">كل المنتجات</option>
                            {products
                                .filter((product) => !filters.categoryId || product.categoryId === filters.categoryId)
                                .map((product) => (
                                    <option key={product.id} value={product.id}>{product.name}</option>
                                ))}
                        </select>
                    </label>
                </div>
            </section>

            {error ? <div className="analytics-alert">{error}</div> : null}

            {status === 'loading' ? <div className="analytics-card">جاري تحميل التحليلات...</div> : null}

            {status === 'succeeded' && overview ? (
                <>
                    <section className="kpi-grid">
                        <article className="kpi-card">
                            <span><MdTrendingUp /> الإيراد المحقق</span>
                            <strong>{formatCurrency(fromCents(overview.totals.deliveredRevenue || 0), currency)}</strong>
                        </article>
                        <article className="kpi-card">
                            <span><MdBarChart /> الربح المحقق</span>
                            <strong>{formatCurrency(fromCents(overview.totals.deliveredProfit || 0), currency)}</strong>
                        </article>
                        <article className="kpi-card">
                            <span><MdShowChart /> الطلب على المنتجات</span>
                            <strong>{(overview.totals.placedUnits || 0).toFixed(0)} وحدة</strong>
                        </article>
                        <article className="kpi-card">
                            <span><MdCalendarToday /> معدل الإلغاء</span>
                            <strong>{formatPercent(overview.totals.cancellationRate)}</strong>
                        </article>
                    </section>

                    <section className="analytics-main-grid">
                        <section className="analytics-card heatmap-card">
                            <div className="section-head">
                                <h3>خريطة الأيام والساعات</h3>
                                <span>الوحدات المباعة عند الطلب</span>
                            </div>
                            <div className="heatmap-layout">
                                <div className="heatmap-hours">
                                    <span></span>
                                    {Array.from({ length: 24 }, (_, hour) => (
                                        <span key={`hour-${hour}`}>{hour}</span>
                                    ))}
                                </div>
                                {(heatmap?.matrix || []).map((day) => (
                                    <div key={`weekday-${day.weekday}`} className="heatmap-row">
                                        <span className="weekday-label">{WEEKDAY_LABELS[day.weekday]}</span>
                                        {day.hours.map((hour) => (
                                            <HeatCell key={`${day.weekday}-${hour.hour}`} value={hour.units} max={heatmapMax} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="analytics-card">
                            <div className="section-head">
                                <h3>أفضل المدن</h3>
                                <span><MdLocationCity /> بحسب الإيراد المحقق</span>
                            </div>
                            {(cityBreakdown?.cities || []).length ? (
                                <div className="city-breakdown">
                                    {cityBreakdown.cities.slice(0, 8).map((city) => (
                                        <article key={city.cityId}>
                                            <div>
                                                <strong>{city.cityName}</strong>
                                                <span>{formatCurrency(fromCents(city.deliveredRevenue || 0), currency)}</span>
                                            </div>
                                            <small>
                                                أفضل المنتجات: {city.topProducts?.map((product) => product.productName).join('، ') || 'لا توجد بيانات'}
                                            </small>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">لا توجد بيانات مدن ضمن الفترة المحددة.</div>
                            )}
                        </section>
                    </section>

                    <section className="analytics-grid-three">
                        <MetricTable title="الأعلى مبيعاً" rows={productPerformance?.topByUnits || []} currency={currency} valueField="placedUnits" />
                        <MetricTable title="الأعلى إيراداً" rows={productPerformance?.topByRevenue || []} currency={currency} metric="currency" valueField="deliveredRevenue" />
                        <MetricTable title="الأعلى ربحاً" rows={productPerformance?.topByProfit || []} currency={currency} metric="currency" valueField="deliveredProfit" />
                    </section>

                    <section className="analytics-grid-three">
                        <MetricTable title="منتجات صاعدة" rows={productPerformance?.risingProducts || []} currency={currency} valueField="growthDelta" />
                        <MetricTable title="منتجات متراجعة" rows={productPerformance?.fallingProducts || []} currency={currency} valueField="growthDelta" />
                        <MetricTable title="بطيئة الحركة" rows={productPerformance?.slowMovers || []} currency={currency} valueField="placedUnits" />
                    </section>

                    <section className="analytics-grid-two">
                        <section className="analytics-card">
                            <div className="section-head">
                                <h3><MdWarningAmber /> تنبيهات المخزون</h3>
                                <span>مقترحات إعادة الطلب والتوقف المحتمل</span>
                            </div>
                            <div className="analytics-table">
                                {(overview.stockIntelligence.reorderNeeded || []).slice(0, 6).map((item) => (
                                    <div key={`reorder-${item.productId}`}>
                                        <span>
                                            {item.productName}
                                            <small>إعادة طلب: {item.recommendedReorderQty}</small>
                                        </span>
                                        <strong>{item.confidence}</strong>
                                    </div>
                                ))}
                                {(overview.stockIntelligence.likelyStockouts || []).slice(0, 6).map((item) => (
                                    <div key={`stockout-${item.productId}`}>
                                        <span>
                                            {item.productName}
                                            <small>نفاد متوقع: {item.predictedStockoutDate || '-'}</small>
                                        </span>
                                        <strong>{item.totalStock}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="analytics-card">
                            <div className="section-head">
                                <h3><MdTrendingDown /> المنتجات الراكدة</h3>
                                <span>مخزون بلا مبيعات ضمن الفترة</span>
                            </div>
                            {(productPerformance?.stockIntelligence?.deadStock || []).length ? (
                                <div className="analytics-table">
                                    {productPerformance.stockIntelligence.deadStock.map((item) => (
                                        <div key={`dead-${item.productId}`}>
                                            <span>
                                                {item.productName}
                                                <small dir="ltr">{item.productCode || '-'}</small>
                                            </span>
                                            <strong>{item.totalStock}</strong>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">لا توجد منتجات راكدة ضمن الفترة الحالية.</div>
                            )}
                        </section>
                    </section>

                    <section className="analytics-card">
                        <div className="section-head">
                            <h3>المنتجات حسب اليوم والساعة</h3>
                            <span>أفضل المنتجات داخل التصفية الحالية</span>
                        </div>
                        <div className="analytics-grid-two">
                            <div className="analytics-table">
                                {(productTimeSlice?.weekdayBuckets || []).map((bucket) => (
                                    <div key={`weekday-bucket-${bucket.weekday}`}>
                                        <span>{WEEKDAY_LABELS[bucket.weekday]}</span>
                                        <strong>{bucket.units.toFixed(0)} وحدة</strong>
                                    </div>
                                ))}
                            </div>
                            <div className="analytics-table">
                                {(productTimeSlice?.topProducts || []).slice(0, 10).map((product) => (
                                    <div key={`slice-product-${product.productId}`}>
                                        <span>
                                            {product.productName}
                                            <small dir="ltr">{product.productCode || '-'}</small>
                                        </span>
                                        <strong>{product.placedUnits.toFixed(0)}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </>
            ) : null}
        </div>
    );
};

export default AnalyticsDashboard;
