const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { chatSendMessage } = require("./src/api/chatSendMessage");
const { startOrderVerificationApi } = require("./src/api/startOrderVerification");
const { confirmOrderVerificationApi } = require("./src/api/confirmOrderVerification");
const { createSupportTicketApi } = require("./src/api/createSupportTicket");
const { deleteSessionTranscriptApi } = require("./src/api/deleteSessionTranscript");
const {
  createPublicCheckoutOrderApi,
  getPublicOrderTrackingApi,
} = require("./src/api/publicOrderApis");
const { createPosSaleApi, updateManagedOrderStatusApi } = require("./src/api/storeAdminApis");
const {
  backfillAnalyticsDataApi,
  getAnalyticsCityBreakdownApi,
  getAnalyticsOverviewApi,
  getAnalyticsProductPerformanceApi,
  getAnalyticsProductTimeSliceApi,
  getAnalyticsTimeHeatmapApi,
} = require("./src/api/analyticsApis");
const { db } = require("./src/utils/firestore");
const { rebuildAllAnalyticsFromSalesFacts, refreshForecastSnapshots } = require("./src/services/analyticsService");

const baseCallableOptions = {
  region: "us-central1",
  timeoutSeconds: 30,
  memory: "512MiB",
};

exports.chatSendMessage = onCall(
  { ...baseCallableOptions, secrets: ["GEMINI_API_KEY", "CHAT_JWT_SECRET"] },
  chatSendMessage
);
exports.startOrderVerification = onCall(baseCallableOptions, startOrderVerificationApi);
exports.confirmOrderVerification = onCall(
  { ...baseCallableOptions, secrets: ["CHAT_JWT_SECRET"] },
  confirmOrderVerificationApi
);
exports.createSupportTicket = onCall(baseCallableOptions, createSupportTicketApi);
exports.deleteSessionTranscript = onCall(baseCallableOptions, deleteSessionTranscriptApi);
exports.createPublicCheckoutOrder = onCall(baseCallableOptions, createPublicCheckoutOrderApi);
exports.getPublicOrderTracking = onCall(baseCallableOptions, getPublicOrderTrackingApi);
exports.createPosSale = onCall(baseCallableOptions, createPosSaleApi);
exports.updateManagedOrderStatus = onCall(baseCallableOptions, updateManagedOrderStatusApi);
exports.getAnalyticsOverview = onCall(baseCallableOptions, getAnalyticsOverviewApi);
exports.getAnalyticsTimeHeatmap = onCall(baseCallableOptions, getAnalyticsTimeHeatmapApi);
exports.getAnalyticsProductPerformance = onCall(baseCallableOptions, getAnalyticsProductPerformanceApi);
exports.getAnalyticsCityBreakdown = onCall(baseCallableOptions, getAnalyticsCityBreakdownApi);
exports.getAnalyticsProductTimeSlice = onCall(baseCallableOptions, getAnalyticsProductTimeSliceApi);
exports.backfillAnalyticsData = onCall(baseCallableOptions, backfillAnalyticsDataApi);

exports.refreshAnalyticsForecastsDaily = onSchedule(
  {
    region: "us-central1",
    schedule: "every day 03:00",
    timeZone: "Africa/Tripoli",
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async () => {
    await rebuildAllAnalyticsFromSalesFacts(db);
    await refreshForecastSnapshots(db);
  }
);
