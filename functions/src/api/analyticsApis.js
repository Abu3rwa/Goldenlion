const { makeCallable } = require("../utils/callableHandler");
const { ok } = require("../utils/response");
const { db } = require("../utils/firestore");
const { assertOwner } = require("../utils/auth");
const { backfillAnalyticsFromOrders, refreshForecastSnapshots } = require("../services/analyticsService");
const {
  getAnalyticsCityBreakdown,
  getAnalyticsOverview,
  getAnalyticsProductPerformance,
  getAnalyticsProductTimeSlice,
  getAnalyticsTimeHeatmap,
} = require("../services/analyticsQueryService");

const getAnalyticsOverviewApi = makeCallable(async (request) => {
  await assertOwner(request);
  const payload = request?.data || {};
  const summary = await getAnalyticsOverview(db, payload);
  return ok({ summary });
});

const getAnalyticsTimeHeatmapApi = makeCallable(async (request) => {
  await assertOwner(request);
  const payload = request?.data || {};
  const summary = await getAnalyticsTimeHeatmap(db, payload);
  return ok({ summary });
});

const getAnalyticsProductPerformanceApi = makeCallable(async (request) => {
  await assertOwner(request);
  const payload = request?.data || {};
  const summary = await getAnalyticsProductPerformance(db, payload);
  return ok({ summary });
});

const getAnalyticsCityBreakdownApi = makeCallable(async (request) => {
  await assertOwner(request);
  const payload = request?.data || {};
  const summary = await getAnalyticsCityBreakdown(db, payload);
  return ok({ summary });
});

const getAnalyticsProductTimeSliceApi = makeCallable(async (request) => {
  await assertOwner(request);
  const payload = request?.data || {};
  const summary = await getAnalyticsProductTimeSlice(db, payload);
  return ok({ summary });
});

const backfillAnalyticsDataApi = makeCallable(async (request) => {
  await assertOwner(request);
  const result = await backfillAnalyticsFromOrders(db);
  await refreshForecastSnapshots(db);
  return ok({ result });
});

module.exports = {
  backfillAnalyticsDataApi,
  getAnalyticsCityBreakdownApi,
  getAnalyticsOverviewApi,
  getAnalyticsProductPerformanceApi,
  getAnalyticsProductTimeSliceApi,
  getAnalyticsTimeHeatmapApi,
};
