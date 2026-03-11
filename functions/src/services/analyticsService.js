const { FieldValue } = require("firebase-admin/firestore");

const COLLECTIONS = {
  PUBLIC_ORDERS: "publicOrders",
  PUBLIC_PRODUCTS: "publicProducts",
  SALES_FACTS: "salesFacts",
  ANALYTICS_DAILY: "analyticsDaily",
  ANALYTICS_HOURLY: "analyticsHourly",
  ANALYTICS_PRODUCT_DAILY: "analyticsProductDaily",
  ANALYTICS_CITY_DAILY: "analyticsCityDaily",
  FORECAST_SNAPSHOTS: "forecastSnapshots",
};

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthKey = (date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const deriveTimeParts = (value) => {
  const date = toDate(value) || new Date();
  return {
    createdAtDate: date,
    createdDateKey: formatDateKey(date),
    createdMonthKey: formatMonthKey(date),
    createdHour: date.getUTCHours(),
    createdWeekday: date.getUTCDay(),
  };
};

const uniqueValues = (items) => Array.from(new Set(items.filter(Boolean)));

const buildSalesFactId = (orderId, itemIndex) => `${orderId}__${itemIndex}`;

const normalizeFactPayload = (order, item, itemIndex) => {
  const timeParts = deriveTimeParts(order.createdAt);
  const quantity = Math.max(0, toSafeNumber(item.quantity, 0));
  const revenue = Math.max(0, toSafeNumber(item.subtotal, toSafeNumber(item.price, 0) * quantity));
  const unitCost = Math.max(0, toSafeNumber(item.costPrice, 0));
  const cost = unitCost * quantity;
  const delivered = order.status === "delivered";

  return {
    id: buildSalesFactId(order.id, itemIndex),
    orderId: order.id,
    orderNumber: order.orderNumber || "",
    channel: order.channel || "storefront",
    status: order.status || "pending",
    paymentStatus: order.paymentStatus || "unpaid",
    paymentMethod: order.paymentMethod || "cash",
    cityId: order.cityId || null,
    cityName: order.cityName || "",
    zoneId: order.zoneId || null,
    zoneName: order.zoneName || "",
    createdAt: order.createdAt || null,
    createdDateKey: order.createdDateKey || timeParts.createdDateKey,
    createdMonthKey: order.createdMonthKey || timeParts.createdMonthKey,
    createdHour: Number.isInteger(order.createdHour) ? order.createdHour : timeParts.createdHour,
    createdWeekday: Number.isInteger(order.createdWeekday) ? order.createdWeekday : timeParts.createdWeekday,
    productId: item.productId || "",
    productCode: item.productCode || "",
    productName: item.productName || "",
    categoryId: item.categoryId || "",
    categoryName: item.categoryName || "",
    selectedColor: item.selectedColor
      ? {
          color: item.selectedColor.color || "",
          colorCode: item.selectedColor.colorCode || "#000000",
          colorKey: item.selectedColor.colorKey || "",
        }
      : null,
    quantity,
    unitPrice: Math.max(0, toSafeNumber(item.price, 0)),
    unitCost,
    revenue,
    cost,
    profit: revenue - cost,
    placedUnits: quantity,
    placedRevenue: revenue,
    deliveredUnits: delivered ? quantity : 0,
    deliveredRevenue: delivered ? revenue : 0,
    deliveredProfit: delivered ? (revenue - cost) : 0,
    itemIndex,
    updatedAt: FieldValue.serverTimestamp(),
  };
};

const groupFactsBy = (facts, keyFn) => {
  return facts.reduce((acc, fact) => {
    const key = keyFn(fact);
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(fact);
    return acc;
  }, {});
};

const summarizeFacts = (facts) => {
  const orderIds = new Set();
  const deliveredOrderIds = new Set();
  const cancelledOrderIds = new Set();
  const posOrderIds = new Set();
  const storefrontOrderIds = new Set();

  let placedUnits = 0;
  let placedRevenue = 0;
  let deliveredUnits = 0;
  let deliveredRevenue = 0;
  let deliveredProfit = 0;

  for (const fact of facts) {
    orderIds.add(fact.orderId);
    if (fact.channel === "pos") {
      posOrderIds.add(fact.orderId);
    } else {
      storefrontOrderIds.add(fact.orderId);
    }
    if (fact.status === "delivered") {
      deliveredOrderIds.add(fact.orderId);
    }
    if (fact.status === "cancelled") {
      cancelledOrderIds.add(fact.orderId);
    }

    placedUnits += toSafeNumber(fact.placedUnits, 0);
    placedRevenue += toSafeNumber(fact.placedRevenue, 0);
    deliveredUnits += toSafeNumber(fact.deliveredUnits, 0);
    deliveredRevenue += toSafeNumber(fact.deliveredRevenue, 0);
    deliveredProfit += toSafeNumber(fact.deliveredProfit, 0);
  }

  return {
    placedUnits,
    placedRevenue,
    deliveredUnits,
    deliveredRevenue,
    deliveredProfit,
    totalOrders: orderIds.size,
    deliveredOrders: deliveredOrderIds.size,
    cancelledOrders: cancelledOrderIds.size,
    posOrders: posOrderIds.size,
    storefrontOrders: storefrontOrderIds.size,
    averageOrderValue: deliveredOrderIds.size > 0 ? deliveredRevenue / deliveredOrderIds.size : 0,
  };
};

async function upsertSalesFactsForOrder(db, order) {
  const facts = Array.isArray(order.items)
    ? order.items.map((item, itemIndex) => normalizeFactPayload(order, item, itemIndex))
    : [];

  const existingSnapshot = await db
    .collection(COLLECTIONS.SALES_FACTS)
    .where("orderId", "==", order.id)
    .get();

  const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));
  const nextIds = new Set(facts.map((fact) => fact.id));

  let batch = db.batch();
  let operations = 0;

  for (const fact of facts) {
    const { id, ...payload } = fact;
    batch.set(
      db.collection(COLLECTIONS.SALES_FACTS).doc(id),
      {
        ...payload,
        factId: id,
      },
      { merge: true }
    );
    operations += 1;
    if (operations >= 400) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  for (const existingId of existingIds) {
    if (!nextIds.has(existingId)) {
      batch.delete(db.collection(COLLECTIONS.SALES_FACTS).doc(existingId));
      operations += 1;
      if (operations >= 400) {
        await batch.commit();
        batch = db.batch();
        operations = 0;
      }
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  return facts;
}

async function writeSummaryCollectionDiff(db, collectionName, nextDocs, queryField, queryValue) {
  const existingSnapshot = await db.collection(collectionName).where(queryField, "==", queryValue).get();
  const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));
  const nextIds = new Set(Object.keys(nextDocs));

  let batch = db.batch();
  let operations = 0;

  for (const [docId, payload] of Object.entries(nextDocs)) {
    batch.set(db.collection(collectionName).doc(docId), payload, { merge: true });
    operations += 1;
    if (operations >= 400) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  for (const docId of existingIds) {
    if (!nextIds.has(docId)) {
      batch.delete(db.collection(collectionName).doc(docId));
      operations += 1;
      if (operations >= 400) {
        await batch.commit();
        batch = db.batch();
        operations = 0;
      }
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

async function refreshDailyAnalyticsForDate(db, createdDateKey) {
  const factsSnapshot = await db
    .collection(COLLECTIONS.SALES_FACTS)
    .where("createdDateKey", "==", createdDateKey)
    .get();

  const facts = factsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const dailyDocRef = db.collection(COLLECTIONS.ANALYTICS_DAILY).doc(createdDateKey);

  if (!facts.length) {
    await dailyDocRef.delete().catch(() => {});
    await writeSummaryCollectionDiff(db, COLLECTIONS.ANALYTICS_HOURLY, {}, "createdDateKey", createdDateKey);
    await writeSummaryCollectionDiff(db, COLLECTIONS.ANALYTICS_PRODUCT_DAILY, {}, "createdDateKey", createdDateKey);
    await writeSummaryCollectionDiff(db, COLLECTIONS.ANALYTICS_CITY_DAILY, {}, "createdDateKey", createdDateKey);
    return {
      dateKey: createdDateKey,
      productIds: [],
    };
  }

  const dailySummary = summarizeFacts(facts);
  await dailyDocRef.set(
    {
      createdDateKey,
      createdMonthKey: facts[0].createdMonthKey || createdDateKey.slice(0, 7),
      ...dailySummary,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const hourlyDocs = {};
  Object.entries(groupFactsBy(facts, (fact) => `${fact.createdHour}`)).forEach(([hourKey, items]) => {
    const hour = Number(hourKey);
    hourlyDocs[`${createdDateKey}__${`${hour}`.padStart(2, "0")}`] = {
      createdDateKey,
      createdMonthKey: items[0].createdMonthKey || createdDateKey.slice(0, 7),
      createdHour: hour,
      ...summarizeFacts(items),
      updatedAt: FieldValue.serverTimestamp(),
    };
  });
  await writeSummaryCollectionDiff(db, COLLECTIONS.ANALYTICS_HOURLY, hourlyDocs, "createdDateKey", createdDateKey);

  const productDocs = {};
  Object.entries(groupFactsBy(facts, (fact) => fact.productId)).forEach(([productId, items]) => {
    const first = items[0];
    productDocs[`${createdDateKey}__${productId}`] = {
      createdDateKey,
      createdMonthKey: first.createdMonthKey || createdDateKey.slice(0, 7),
      createdWeekday: first.createdWeekday,
      productId,
      productCode: first.productCode || "",
      productName: first.productName || "",
      categoryId: first.categoryId || "",
      categoryName: first.categoryName || "",
      ...summarizeFacts(items),
      updatedAt: FieldValue.serverTimestamp(),
    };
  });
  await writeSummaryCollectionDiff(
    db,
    COLLECTIONS.ANALYTICS_PRODUCT_DAILY,
    productDocs,
    "createdDateKey",
    createdDateKey
  );

  const cityDocs = {};
  Object.entries(groupFactsBy(facts.filter((fact) => fact.cityId), (fact) => fact.cityId)).forEach(
    ([cityId, items]) => {
      const first = items[0];
      cityDocs[`${createdDateKey}__${cityId}`] = {
        createdDateKey,
        createdMonthKey: first.createdMonthKey || createdDateKey.slice(0, 7),
        cityId,
        cityName: first.cityName || "",
        ...summarizeFacts(items),
        updatedAt: FieldValue.serverTimestamp(),
      };
    }
  );
  await writeSummaryCollectionDiff(db, COLLECTIONS.ANALYTICS_CITY_DAILY, cityDocs, "createdDateKey", createdDateKey);

  return {
    dateKey: createdDateKey,
    productIds: uniqueValues(facts.map((fact) => fact.productId)),
  };
}

function computeDailyDemandMetrics(docsByDateKey, startDate, days) {
  const series = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() - index);
    const key = formatDateKey(date);
    series.push({
      key,
      weekday: date.getUTCDay(),
      placedUnits: toSafeNumber(docsByDateKey[key]?.placedUnits, 0),
    });
  }
  return series;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function refreshForecastSnapshots(db, productIds = null) {
  const productSnapshots = await db.collection(COLLECTIONS.PUBLIC_PRODUCTS).get();
  const analyticsSnapshots = await db.collection(COLLECTIONS.ANALYTICS_PRODUCT_DAILY).get();

  const dailyDocsByProduct = analyticsSnapshots.docs.reduce((acc, doc) => {
    const data = doc.data() || {};
    if (!data.productId) return acc;
    acc[data.productId] = acc[data.productId] || {};
    acc[data.productId][data.createdDateKey] = data;
    return acc;
  }, {});

  const allowedProductIds = Array.isArray(productIds) && productIds.length > 0 ? new Set(productIds) : null;
  let batch = db.batch();
  let operations = 0;
  const now = new Date();

  for (const snapshot of productSnapshots.docs) {
    const productId = snapshot.id;
    if (allowedProductIds && !allowedProductIds.has(productId)) {
      continue;
    }

    const product = snapshot.data() || {};
    const dailyDocs = dailyDocsByProduct[productId] || {};
    const history = computeDailyDemandMetrics(dailyDocs, now, 28);

    const sumWindow = (count) => history.slice(0, count).reduce((sum, item) => sum + item.placedUnits, 0);
    const distinctSaleDays = history.filter((item) => item.placedUnits > 0).length;
    const avg7 = sumWindow(7) / 7;
    const avg14 = sumWindow(14) / 14;
    const avg28 = sumWindow(28) / 28;
    const baseDailyDemand = (avg7 * 0.5) + (avg14 * 0.3) + (avg28 * 0.2);

    const weekdayBuckets = history.reduce((acc, item) => {
      acc[item.weekday] = acc[item.weekday] || [];
      acc[item.weekday].push(item.placedUnits);
      return acc;
    }, {});

    const weekdayMeans = Object.entries(weekdayBuckets).reduce((acc, [weekday, values]) => {
      acc[weekday] = values.reduce((sum, value) => sum + value, 0) / values.length;
      return acc;
    }, {});

    const meanOfWeekdays = Object.keys(weekdayMeans).length > 0
      ? Object.values(weekdayMeans).reduce((sum, value) => sum + value, 0) / Object.values(weekdayMeans).length
      : 0;

    const weekdayMultiplier = (weekday) => {
      if (!meanOfWeekdays || !weekdayMeans[weekday]) return 1;
      return clamp(weekdayMeans[weekday] / meanOfWeekdays, 0.5, 1.75);
    };

    const forecastDays = (days) => {
      let total = 0;
      for (let index = 1; index <= days; index += 1) {
        const futureDate = new Date(now);
        futureDate.setUTCDate(now.getUTCDate() + index);
        total += baseDailyDemand * weekdayMultiplier(futureDate.getUTCDay());
      }
      return total;
    };

    const totalStock = Array.isArray(product.colorVariants) && product.colorVariants.length > 0
      ? product.colorVariants.reduce((sum, variant) => sum + Math.max(0, toSafeNumber(variant.quantity, 0)), 0)
      : Math.max(0, toSafeNumber(product.totalStock, 0));
    const minimumStock = Math.max(0, toSafeNumber(product.minimumStock, 0));
    const leadTimeDays = Math.max(1, toSafeNumber(product.leadTimeDays, 7));
    const expectedDemand7d = forecastDays(7);
    const expectedDemand30d = forecastDays(30);
    const leadTimeDemand = forecastDays(leadTimeDays);
    const fallbackSafetyStock = Math.ceil(baseDailyDemand * 3);
    const configuredReorderPoint = Math.max(0, toSafeNumber(product.reorderPoint, 0));
    const safetyStock = Math.max(minimumStock, configuredReorderPoint, fallbackSafetyStock);
    const recommendedReorderQty = Math.max(0, Math.ceil(leadTimeDemand + safetyStock - totalStock));

    let predictedStockoutDate = null;
    if (totalStock > 0 && baseDailyDemand > 0) {
      let simulatedStock = totalStock;
      for (let index = 1; index <= 180; index += 1) {
        const futureDate = new Date(now);
        futureDate.setUTCDate(now.getUTCDate() + index);
        simulatedStock -= baseDailyDemand * weekdayMultiplier(futureDate.getUTCDay());
        if (simulatedStock <= 0) {
          predictedStockoutDate = formatDateKey(futureDate);
          break;
        }
      }
    }

    const confidence = distinctSaleDays >= 21 ? "high" : (distinctSaleDays >= 7 ? "medium" : "low");

    batch.set(
      db.collection(COLLECTIONS.FORECAST_SNAPSHOTS).doc(productId),
      {
        productId,
        productCode: product.code || "",
        productName: product.name || "",
        categoryId: product.categoryId || "",
        categoryName: product.categoryName || "",
        totalStock,
        minimumStock,
        reorderPoint: configuredReorderPoint,
        leadTimeDays,
        preferredSupplierId: product.preferredSupplierId || null,
        expectedDemand7d,
        expectedDemand30d,
        predictedStockoutDate,
        recommendedReorderQty,
        confidence,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    operations += 1;
    if (operations >= 400) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

async function refreshAnalyticsForOrder(db, order) {
  await upsertSalesFactsForOrder(db, order);
  const { productIds } = await refreshDailyAnalyticsForDate(db, order.createdDateKey || deriveTimeParts(order.createdAt).createdDateKey);
  await refreshForecastSnapshots(db, productIds);
  return {
    updatedProductIds: productIds,
  };
}

async function clearCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) return 0;

  let batch = db.batch();
  let operations = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    operations += 1;
    if (operations >= 400) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }
  if (operations > 0) {
    await batch.commit();
  }
  return snapshot.size;
}

async function rebuildAllAnalyticsFromSalesFacts(db) {
  await Promise.all([
    clearCollection(db, COLLECTIONS.ANALYTICS_DAILY),
    clearCollection(db, COLLECTIONS.ANALYTICS_HOURLY),
    clearCollection(db, COLLECTIONS.ANALYTICS_PRODUCT_DAILY),
    clearCollection(db, COLLECTIONS.ANALYTICS_CITY_DAILY),
  ]);

  const snapshot = await db.collection(COLLECTIONS.SALES_FACTS).get();
  const facts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const dateKeys = uniqueValues(facts.map((fact) => fact.createdDateKey));

  for (const dateKey of dateKeys) {
    await refreshDailyAnalyticsForDate(db, dateKey);
  }

  await refreshForecastSnapshots(db);

  return {
    facts: facts.length,
    dates: dateKeys.length,
  };
}

async function backfillAnalyticsFromOrders(db) {
  const ordersSnapshot = await db.collection(COLLECTIONS.PUBLIC_ORDERS).get();
  const orders = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  for (const order of orders) {
    await upsertSalesFactsForOrder(db, order);
  }

  const rebuildResult = await rebuildAllAnalyticsFromSalesFacts(db);

  return {
    orders: orders.length,
    ...rebuildResult,
  };
}

module.exports = {
  COLLECTIONS,
  backfillAnalyticsFromOrders,
  buildSalesFactId,
  deriveTimeParts,
  refreshAnalyticsForOrder,
  refreshDailyAnalyticsForDate,
  refreshForecastSnapshots,
  rebuildAllAnalyticsFromSalesFacts,
  summarizeFacts,
  toSafeNumber,
};
