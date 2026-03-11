const { AppError } = require("../utils/appError");
const { COLLECTIONS, summarizeFacts, toSafeNumber } = require("./analyticsService");

const DEFAULT_RANGE_DAYS = 30;

const formatDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  const normalized = `${value || ""}`.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
};

const resolveDateRange = (filters = {}) => {
  const today = new Date();
  const endDateKey = parseDateKey(filters.endDate) || formatDateKey(today);
  const endDate = new Date(`${endDateKey}T00:00:00.000Z`);

  let startDateKey = parseDateKey(filters.startDate);
  if (!startDateKey) {
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));
    startDateKey = formatDateKey(startDate);
  }

  if (startDateKey > endDateKey) {
    throw new AppError("INVALID_DATE_RANGE", "نطاق التاريخ غير صالح.", 400, {
      startDate: startDateKey,
      endDate: endDateKey,
    });
  }

  return {
    startDate: startDateKey,
    endDate: endDateKey,
  };
};

const normalizeMetricMode = (value, fallback = "placed") => {
  return value === "delivered" ? "delivered" : fallback;
};

const normalizeFilters = (filters = {}) => {
  const { startDate, endDate } = resolveDateRange(filters);
  const hasNumericValue = (value) => value != null && `${value}`.trim() !== "";
  const weekday = filters.weekday === 0 || filters.weekday === "0"
    ? 0
    : (hasNumericValue(filters.weekday) && Number.isInteger(Number(filters.weekday)) ? Number(filters.weekday) : null);
  const hourStart = hasNumericValue(filters.hourStart) && Number.isInteger(Number(filters.hourStart))
    ? Number(filters.hourStart)
    : null;
  const hourEnd = hasNumericValue(filters.hourEnd) && Number.isInteger(Number(filters.hourEnd))
    ? Number(filters.hourEnd)
    : null;

  return {
    startDate,
    endDate,
    categoryId: `${filters.categoryId || ""}`.trim(),
    productId: `${filters.productId || ""}`.trim(),
    cityId: `${filters.cityId || ""}`.trim(),
    weekday,
    hourStart,
    hourEnd,
    metricMode: normalizeMetricMode(filters.metricMode),
  };
};

async function getCollectionDocsByDateRange(db, collectionName, startDate, endDate) {
  const snapshot = await db
    .collection(collectionName)
    .where("createdDateKey", ">=", startDate)
    .where("createdDateKey", "<=", endDate)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getForecastSnapshots(db) {
  const snapshot = await db.collection(COLLECTIONS.FORECAST_SNAPSHOTS).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getPublicProducts(db) {
  const snapshot = await db.collection(COLLECTIONS.PUBLIC_PRODUCTS).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getSalesFacts(db, filters = {}) {
  const normalized = normalizeFilters(filters);
  const facts = await getCollectionDocsByDateRange(
    db,
    COLLECTIONS.SALES_FACTS,
    normalized.startDate,
    normalized.endDate
  );

  return facts.filter((fact) => {
    if (normalized.categoryId && fact.categoryId !== normalized.categoryId) return false;
    if (normalized.productId && fact.productId !== normalized.productId) return false;
    if (normalized.cityId && fact.cityId !== normalized.cityId) return false;
    if (normalized.weekday != null && Number(fact.createdWeekday) !== normalized.weekday) return false;
    if (normalized.hourStart != null && Number(fact.createdHour) < normalized.hourStart) return false;
    if (normalized.hourEnd != null && Number(fact.createdHour) > normalized.hourEnd) return false;
    return true;
  });
}

const sumDocs = (docs, field) => docs.reduce((sum, doc) => sum + toSafeNumber(doc[field], 0), 0);

const metricFieldForMode = (mode, base) => {
  if (mode === "delivered") {
    if (base === "units") return "deliveredUnits";
    if (base === "revenue") return "deliveredRevenue";
    if (base === "profit") return "deliveredProfit";
  }
  if (base === "units") return "placedUnits";
  if (base === "revenue") return "placedRevenue";
  return "profit";
};

async function getAnalyticsOverview(db, filters = {}) {
  const normalized = normalizeFilters(filters);
  const hasFactLevelFilters = Boolean(
    normalized.categoryId ||
    normalized.productId ||
    normalized.weekday != null ||
    normalized.hourStart != null ||
    normalized.hourEnd != null
  );

  let totals;
  if (hasFactLevelFilters) {
    const facts = await getSalesFacts(db, normalized);
    totals = summarizeFacts(facts);
  } else {
    const docs = normalized.cityId
      ? await getCollectionDocsByDateRange(db, COLLECTIONS.ANALYTICS_CITY_DAILY, normalized.startDate, normalized.endDate)
      : await getCollectionDocsByDateRange(db, COLLECTIONS.ANALYTICS_DAILY, normalized.startDate, normalized.endDate);

    const scopedDocs = normalized.cityId ? docs.filter((doc) => doc.cityId === normalized.cityId) : docs;
    totals = {
      deliveredRevenue: sumDocs(scopedDocs, "deliveredRevenue"),
      deliveredProfit: sumDocs(scopedDocs, "deliveredProfit"),
      deliveredUnits: sumDocs(scopedDocs, "deliveredUnits"),
      placedUnits: sumDocs(scopedDocs, "placedUnits"),
      totalOrders: sumDocs(scopedDocs, "totalOrders"),
      deliveredOrders: sumDocs(scopedDocs, "deliveredOrders"),
      cancelledOrders: sumDocs(scopedDocs, "cancelledOrders"),
    };
  }

  const forecasts = await getForecastSnapshots(db);
  const scopedForecasts = forecasts.filter((item) => {
    if (normalized.productId && item.productId !== normalized.productId) return false;
    if (normalized.categoryId && item.categoryId !== normalized.categoryId) return false;
    return true;
  });

  return {
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    totals: {
      deliveredRevenue: totals.deliveredRevenue || 0,
      deliveredProfit: totals.deliveredProfit || 0,
      deliveredUnits: totals.deliveredUnits || 0,
      placedUnits: totals.placedUnits || 0,
      totalOrders: totals.totalOrders || 0,
      deliveredOrders: totals.deliveredOrders || 0,
      cancelledOrders: totals.cancelledOrders || 0,
      cancellationRate: (totals.totalOrders || 0) > 0 ? (totals.cancelledOrders || 0) / totals.totalOrders : 0,
      averageOrderValue: (totals.deliveredOrders || 0) > 0 ? (totals.deliveredRevenue || 0) / totals.deliveredOrders : 0,
    },
    stockIntelligence: {
      reorderNeeded: scopedForecasts
        .filter((item) => toSafeNumber(item.recommendedReorderQty, 0) > 0)
        .sort((a, b) => toSafeNumber(b.recommendedReorderQty, 0) - toSafeNumber(a.recommendedReorderQty, 0))
        .slice(0, 6),
      likelyStockouts: scopedForecasts
        .filter((item) => item.predictedStockoutDate)
        .sort((a, b) => `${a.predictedStockoutDate || ""}`.localeCompare(`${b.predictedStockoutDate || ""}`))
        .slice(0, 6),
    },
  };
}

async function getAnalyticsTimeHeatmap(db, filters = {}) {
  const normalized = normalizeFilters(filters);
  const facts = await getSalesFacts(db, normalized);
  const unitsField = metricFieldForMode(normalized.metricMode, "units");
  const revenueField = metricFieldForMode(normalized.metricMode, "revenue");

  const matrix = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    hours: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      units: 0,
      revenue: 0,
    })),
  }));

  for (const fact of facts) {
    const weekday = Number(fact.createdWeekday);
    const hour = Number(fact.createdHour);
    if (!Number.isInteger(weekday) || !Number.isInteger(hour)) continue;
    matrix[weekday].hours[hour].units += toSafeNumber(fact[unitsField], 0);
    matrix[weekday].hours[hour].revenue += toSafeNumber(fact[revenueField], 0);
  }

  return {
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    metricMode: normalized.metricMode,
    matrix,
  };
}

async function getAnalyticsProductPerformance(db, filters = {}) {
  const normalized = normalizeFilters(filters);
  const facts = await getSalesFacts(db, normalized);
  const metricMode = normalized.metricMode;
  const byProduct = new Map();

  for (const fact of facts) {
    const key = fact.productId || "unknown";
    if (!byProduct.has(key)) {
      byProduct.set(key, {
        productId: fact.productId || "",
        productCode: fact.productCode || "",
        productName: fact.productName || "",
        categoryId: fact.categoryId || "",
        categoryName: fact.categoryName || "",
        placedUnits: 0,
        placedRevenue: 0,
        deliveredUnits: 0,
        deliveredRevenue: 0,
        deliveredProfit: 0,
        last7PlacedUnits: 0,
        previous7PlacedUnits: 0,
      });
    }

    const row = byProduct.get(key);
    row.placedUnits += toSafeNumber(fact.placedUnits, 0);
    row.placedRevenue += toSafeNumber(fact.placedRevenue, 0);
    row.deliveredUnits += toSafeNumber(fact.deliveredUnits, 0);
    row.deliveredRevenue += toSafeNumber(fact.deliveredRevenue, 0);
    row.deliveredProfit += toSafeNumber(fact.deliveredProfit, 0);

  }

  const endDate = new Date(`${normalized.endDate}T00:00:00.000Z`);
  const last7Start = new Date(endDate);
  last7Start.setUTCDate(endDate.getUTCDate() - 6);
  const prev7Start = new Date(endDate);
  prev7Start.setUTCDate(endDate.getUTCDate() - 13);
  const last7StartKey = formatDateKey(last7Start);
  const prev7StartKey = formatDateKey(prev7Start);

  for (const fact of facts) {
    const row = byProduct.get(fact.productId || "unknown");
    if (!row) continue;
    if (fact.createdDateKey >= last7StartKey && fact.createdDateKey <= normalized.endDate) {
      row.last7PlacedUnits += toSafeNumber(fact.placedUnits, 0);
    } else if (fact.createdDateKey >= prev7StartKey && fact.createdDateKey < last7StartKey) {
      row.previous7PlacedUnits += toSafeNumber(fact.placedUnits, 0);
    }
  }

  const products = Array.from(byProduct.values()).map((row) => ({
    ...row,
    growthDelta: row.last7PlacedUnits - row.previous7PlacedUnits,
  }));

  const forecasts = await getForecastSnapshots(db);
  const allProducts = await getPublicProducts(db);
  const soldProductIds = new Set(products.map((item) => item.productId));
  const deadStock = allProducts
    .filter((product) => {
      if (normalized.categoryId && product.categoryId !== normalized.categoryId) return false;
      if (normalized.productId && product.id !== normalized.productId) return false;
      const totalStock = Math.max(0, toSafeNumber(product.totalStock, 0));
      return totalStock > 0 && !soldProductIds.has(product.id);
    })
    .slice(0, 10)
    .map((product) => ({
      productId: product.id,
      productCode: product.code || "",
      productName: product.name || "",
      totalStock: toSafeNumber(product.totalStock, 0),
    }));

  const metricUnits = metricFieldForMode(metricMode, "units");
  const metricProfit = "deliveredProfit";

  return {
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    metricMode,
    topByUnits: [...products]
      .sort((a, b) => toSafeNumber(b[metricUnits], 0) - toSafeNumber(a[metricUnits], 0))
      .slice(0, 10),
    topByRevenue: [...products]
      .sort((a, b) => toSafeNumber(b.deliveredRevenue, 0) - toSafeNumber(a.deliveredRevenue, 0))
      .slice(0, 10),
    topByProfit: [...products]
      .sort((a, b) => toSafeNumber(b[metricProfit], 0) - toSafeNumber(a[metricProfit], 0))
      .slice(0, 10),
    slowMovers: [...products]
      .filter((item) => toSafeNumber(item[metricUnits], 0) > 0)
      .sort((a, b) => toSafeNumber(a[metricUnits], 0) - toSafeNumber(b[metricUnits], 0))
      .slice(0, 10),
    risingProducts: [...products]
      .sort((a, b) => b.growthDelta - a.growthDelta)
      .slice(0, 10),
    fallingProducts: [...products]
      .sort((a, b) => a.growthDelta - b.growthDelta)
      .slice(0, 10),
    stockIntelligence: {
      reorderNeeded: forecasts
        .filter((item) => !normalized.productId || item.productId === normalized.productId)
        .filter((item) => !normalized.categoryId || item.categoryId === normalized.categoryId)
        .filter((item) => toSafeNumber(item.recommendedReorderQty, 0) > 0)
        .sort((a, b) => toSafeNumber(b.recommendedReorderQty, 0) - toSafeNumber(a.recommendedReorderQty, 0))
        .slice(0, 10),
      deadStock,
    },
  };
}

async function getAnalyticsCityBreakdown(db, filters = {}) {
  const normalized = normalizeFilters(filters);
  const facts = await getSalesFacts(db, normalized);
  const grouped = new Map();
  const productMapByCity = new Map();

  for (const fact of facts) {
    if (!fact.cityId) continue;
    if (!grouped.has(fact.cityId)) {
      grouped.set(fact.cityId, {
        cityId: fact.cityId,
        cityName: fact.cityName || "",
        placedUnits: 0,
        placedRevenue: 0,
        deliveredUnits: 0,
        deliveredRevenue: 0,
        deliveredProfit: 0,
      });
    }
    const row = grouped.get(fact.cityId);
    row.placedUnits += toSafeNumber(fact.placedUnits, 0);
    row.placedRevenue += toSafeNumber(fact.placedRevenue, 0);
    row.deliveredUnits += toSafeNumber(fact.deliveredUnits, 0);
    row.deliveredRevenue += toSafeNumber(fact.deliveredRevenue, 0);
    row.deliveredProfit += toSafeNumber(fact.deliveredProfit, 0);

    productMapByCity.set(fact.cityId, productMapByCity.get(fact.cityId) || new Map());
    const cityProducts = productMapByCity.get(fact.cityId);
    const productKey = fact.productId || "unknown";
    if (!cityProducts.has(productKey)) {
      cityProducts.set(productKey, {
        productId: fact.productId || "",
        productName: fact.productName || "",
        productCode: fact.productCode || "",
        placedUnits: 0,
      });
    }
    cityProducts.get(productKey).placedUnits += toSafeNumber(fact.placedUnits, 0);
  }

  const cities = Array.from(grouped.values())
    .map((city) => ({
      ...city,
      topProducts: Array.from(productMapByCity.get(city.cityId)?.values() || [])
        .sort((a, b) => b.placedUnits - a.placedUnits)
        .slice(0, 5),
    }))
    .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);

  return {
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    cities,
  };
}

async function getAnalyticsProductTimeSlice(db, filters = {}) {
  const normalized = normalizeFilters(filters);
  const facts = await getSalesFacts(db, normalized);
  const weekdayBuckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    units: 0,
    revenue: 0,
  }));
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    units: 0,
    revenue: 0,
  }));

  for (const fact of facts) {
    const weekday = Number(fact.createdWeekday);
    const hour = Number(fact.createdHour);
    if (Number.isInteger(weekday)) {
      weekdayBuckets[weekday].units += toSafeNumber(fact.placedUnits, 0);
      weekdayBuckets[weekday].revenue += toSafeNumber(fact.placedRevenue, 0);
    }
    if (Number.isInteger(hour)) {
      hourBuckets[hour].units += toSafeNumber(fact.placedUnits, 0);
      hourBuckets[hour].revenue += toSafeNumber(fact.placedRevenue, 0);
    }
  }

  const topProductsMap = new Map();
  for (const fact of facts) {
    const key = fact.productId || "unknown";
    if (!topProductsMap.has(key)) {
      topProductsMap.set(key, {
        productId: fact.productId || "",
        productCode: fact.productCode || "",
        productName: fact.productName || "",
        placedUnits: 0,
        placedRevenue: 0,
      });
    }
    const row = topProductsMap.get(key);
    row.placedUnits += toSafeNumber(fact.placedUnits, 0);
    row.placedRevenue += toSafeNumber(fact.placedRevenue, 0);
  }

  return {
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    weekdayBuckets,
    hourBuckets,
    topProducts: Array.from(topProductsMap.values())
      .sort((a, b) => b.placedUnits - a.placedUnits)
      .slice(0, 10),
  };
}

module.exports = {
  getAnalyticsCityBreakdown,
  getAnalyticsOverview,
  getAnalyticsProductPerformance,
  getAnalyticsProductTimeSlice,
  getAnalyticsTimeHeatmap,
  normalizeFilters,
  resolveDateRange,
};
