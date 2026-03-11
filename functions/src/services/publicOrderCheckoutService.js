const crypto = require("crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { AppError } = require("../utils/appError");
const { deriveTimeParts, refreshAnalyticsForOrder, toSafeNumber } = require("./analyticsService");
const { syncPublicCategoryCountsForList } = require("./publicCategoryAdminService");

const ORDER_STATUS_PENDING = "pending";
const ORDER_STATUS_CONFIRMED = "confirmed";
const ORDER_STATUS_SHIPPED = "shipped";
const ORDER_STATUS_DELIVERED = "delivered";
const ORDER_STATUS_CANCELLED = "cancelled";

const PAYMENT_STATUS_UNPAID = "unpaid";
const PAYMENT_STATUS_PAID = "paid";

const normalizeOrderNumberInput = (value) => `${value || ""}`.trim().toUpperCase();
const normalizeColorKey = (value) => `${value || ""}`.trim().toLowerCase();

const sanitizePhone = (value) => `${value || ""}`.replace(/\D/g, "");

const buildOrderNumber = (prefix, date = new Date()) => {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
};

const allocateOrderNumber = async (transaction, db, prefix) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildOrderNumber(prefix);
    const snapshot = await transaction.get(
      db.collection("publicOrders").where("orderNumber", "==", candidate).limit(1)
    );
    if (snapshot.empty) {
      return candidate;
    }
  }

  throw new AppError("ORDER_NUMBER_GENERATION_FAILED", "تعذر إنشاء رقم عملية فريد. حاول مرة أخرى.", 503);
};

const sanitizeTrackingPayload = (orderData) => {
  if (!orderData || orderData.channel === "pos") return null;

  return {
    orderNumber: orderData.orderNumber || "",
    status: orderData.status || ORDER_STATUS_PENDING,
    createdAt: orderData.createdAt || null,
    cityName: orderData.cityName || "",
    deliveryCharge: toSafeNumber(orderData.deliveryCharge, 0),
    subtotal: toSafeNumber(orderData.subtotal, 0),
    total: toSafeNumber(orderData.total, 0),
    paymentStatus: orderData.paymentStatus || PAYMENT_STATUS_UNPAID,
    items: Array.isArray(orderData.items)
      ? orderData.items.map((item) => ({
          productName: item.productName || "",
          quantity: toSafeNumber(item.quantity, 0),
          price: toSafeNumber(item.price, 0),
          subtotal: toSafeNumber(item.subtotal, 0),
          image: item.image || "",
          selectedColor: item.selectedColor
            ? {
                color: item.selectedColor.color || "",
                colorCode: item.selectedColor.colorCode || "#000000",
              }
            : null,
        }))
      : [],
  };
};

const hydrateSnapshot = (snapshot, fallbackId = "") => ({
  id: snapshot?.id || fallbackId,
  ...(snapshot?.data ? snapshot.data() : {}),
});

const findOrderByNumber = async (db, rawOrderNumber, options = {}) => {
  const normalized = normalizeOrderNumberInput(rawOrderNumber);
  const includePos = options.includePos !== false;
  if (!normalized) {
    throw new AppError("ORDER_NUMBER_REQUIRED", "رقم الطلب مطلوب.", 400);
  }

  const candidates = Array.from(new Set([normalized, normalized.toLowerCase()]));
  for (const orderNumber of candidates) {
    const snapshot = await db
      .collection("publicOrders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const order = hydrateSnapshot(snapshot.docs[0]);
      if (!includePos && order.channel === "pos") {
        return null;
      }
      return order;
    }
  }

  return null;
};

const buildCustomerPayload = (orderData, requireCustomer) => {
  const customerName = `${orderData?.customerName || ""}`.trim();
  const customerPhone = sanitizePhone(orderData?.customerPhone);
  const customerAddress = `${orderData?.customerAddress || ""}`.trim();
  const customerEmail = `${orderData?.customerEmail || ""}`.trim();

  if (requireCustomer && (!customerName || !customerPhone || !customerAddress)) {
    throw new AppError("INVALID_ORDER_PAYLOAD", "بيانات العميل غير مكتملة.", 400);
  }

  return {
    name: customerName,
    phone: customerPhone,
    address: customerAddress,
    email: customerEmail,
  };
};

const resolveCityPayload = (orderData, requireCity) => {
  const cityId = `${orderData?.cityId || ""}`.trim();
  const cityName = `${orderData?.cityName || ""}`.trim();
  if (requireCity && (!cityId || !cityName)) {
    throw new AppError("INVALID_ORDER_PAYLOAD", "بيانات المدينة غير مكتملة.", 400);
  }

  return {
    cityId: cityId || null,
    cityName: cityName || "",
  };
};

const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("ORDER_ITEMS_REQUIRED", "لا يمكن إتمام العملية بدون منتجات.", 400);
  }
  return items;
};

async function createManagedOrderTransactional(db, orderData, options = {}) {
  const normalizedItems = validateOrderItems(orderData?.items);
  const mode = options.mode || "storefront";
  const channel = options.channel || mode;
  const requireCustomer = options.requireCustomer !== false;
  const requireCity = options.requireCity !== false;
  const customer = buildCustomerPayload(orderData, requireCustomer);
  const city = resolveCityPayload(orderData, requireCity);
  const zoneId = `${orderData?.zoneId || ""}`.trim() || null;
  const zoneName = `${orderData?.zoneName || ""}`.trim() || "";
  const deliveryCharge = Math.max(0, toSafeNumber(orderData?.deliveryCharge, 0));
  const customerNotes = `${orderData?.customerNotes || orderData?.notes || ""}`.trim();
  const soldByUserId = options.soldByUserId || null;
  const soldByUserName = options.soldByUserName || "";
  const status = options.status || ORDER_STATUS_PENDING;
  const paymentMethod = options.paymentMethod || "cash";
  const paymentStatus = options.paymentStatus || PAYMENT_STATUS_UNPAID;
  const timeParts = deriveTimeParts(new Date());
  const orderRef = db.collection("publicOrders").doc();
  let createdOrderNumber = "";
  const touchedCategoryIds = new Set();

  await db.runTransaction(async (transaction) => {
    const orderItems = [];
    const pendingProductUpdates = [];

    createdOrderNumber = await allocateOrderNumber(
      transaction,
      db,
      channel === "pos" ? "POS" : "GL"
    );

    for (const item of normalizedItems) {
      const productId = `${item?.productId || ""}`.trim();
      const quantity = Math.max(0, toSafeNumber(item?.quantity, 0));
      if (!productId || quantity <= 0) {
        throw new AppError("INVALID_ORDER_ITEM", "أحد عناصر العملية غير صالح.", 400, { productId });
      }

      const productRef = db.collection("publicProducts").doc(productId);
      const productSnapshot = await transaction.get(productRef);
      if (!productSnapshot.exists) {
        throw new AppError("PRODUCT_NOT_FOUND", "أحد المنتجات لم يعد متاحا.", 409, { productId });
      }

      const product = productSnapshot.data() || {};
      const productName = `${product.name || item.productName || "منتج"}`.trim();
      const productPrice = toSafeNumber(product.price, NaN);
      const productCostPrice = toSafeNumber(product.costPrice, 0);
      const productImage = Array.isArray(product.images) ? (product.images[0] || "") : "";

      if (!Number.isFinite(productPrice) || productPrice < 0) {
        throw new AppError("INVALID_PRODUCT_PRICE", "تعذر تحديد سعر منتج في العملية.", 409, {
          productId,
        });
      }

      let selectedColor = null;
      const hasVariants = Array.isArray(product.colorVariants) && product.colorVariants.length > 0;
      if (hasVariants) {
        const selectedKey = normalizeColorKey(item?.selectedColor?.colorKey || item?.selectedColor?.color);
        if (!selectedKey) {
          throw new AppError("COLOR_REQUIRED", "يرجى اختيار اللون لهذا المنتج.", 409, { productId });
        }

        const variantIndex = product.colorVariants.findIndex((variant) => {
          const variantKey = normalizeColorKey(variant?.colorKey || variant?.color);
          return variantKey === selectedKey;
        });
        if (variantIndex === -1) {
          throw new AppError("COLOR_NOT_FOUND", "اللون المحدد غير متاح حاليا.", 409, { productId });
        }

        const variant = product.colorVariants[variantIndex];
        const currentVariantQty = Math.max(0, toSafeNumber(variant?.quantity, 0));
        if (currentVariantQty < quantity) {
          throw new AppError("INSUFFICIENT_STOCK", `المخزون غير كاف للمنتج ${productName}.`, 409, {
            productId,
            productName,
            available: currentVariantQty,
            requested: quantity,
            color: variant?.color || "",
          });
        }

        const updatedVariants = [...product.colorVariants];
        updatedVariants[variantIndex] = {
          ...variant,
          quantity: currentVariantQty - quantity,
        };

        const totalStock = updatedVariants.reduce(
          (sum, variantItem) => sum + Math.max(0, toSafeNumber(variantItem?.quantity, 0)),
          0
        );

        pendingProductUpdates.push({
          productRef,
          updatePayload: {
            colorVariants: updatedVariants,
            totalStock,
            inStock: totalStock > 0,
            updatedAt: FieldValue.serverTimestamp(),
          },
        });

        selectedColor = {
          color: variant?.color || item?.selectedColor?.color || "",
          colorCode: variant?.colorCode || item?.selectedColor?.colorCode || "#000000",
          colorKey: normalizeColorKey(variant?.colorKey || variant?.color),
        };
      } else {
        const totalStock = Math.max(0, toSafeNumber(product.totalStock, product.inStock ? 1 : 0));
        if (totalStock < quantity) {
          throw new AppError("INSUFFICIENT_STOCK", `المخزون غير كاف للمنتج ${productName}.`, 409, {
            productId,
            productName,
            available: totalStock,
            requested: quantity,
          });
        }

        const nextStock = totalStock - quantity;
        pendingProductUpdates.push({
          productRef,
          updatePayload: {
            totalStock: nextStock,
            inStock: nextStock > 0,
            updatedAt: FieldValue.serverTimestamp(),
          },
        });
      }

      orderItems.push({
        productId,
        productCode: product.code || "",
        productName,
        image: productImage,
        price: productPrice,
        costPrice: productCostPrice,
        quantity,
        subtotal: productPrice * quantity,
        selectedColor,
        categoryId: product.categoryId || "",
        categoryName: product.categoryName || "",
      });
      if (product.categoryId) {
        touchedCategoryIds.add(product.categoryId);
      }
    }

    for (const pendingUpdate of pendingProductUpdates) {
      transaction.update(pendingUpdate.productRef, pendingUpdate.updatePayload);
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalCost = orderItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
    const total = subtotal + deliveryCharge;

    transaction.set(orderRef, {
      orderNumber: createdOrderNumber,
      channel,
      soldByUserId,
      soldByUserName,
      customer,
      cityId: city.cityId,
      cityName: city.cityName,
      zoneId,
      zoneName,
      deliveryCharge,
      items: orderItems,
      subtotal,
      total,
      totalCost,
      estimatedProfit: total - totalCost,
      status,
      paymentMethod,
      paymentStatus,
      coupon: orderData?.coupon || null,
      customerNotes,
      adminNotes: `${orderData?.adminNotes || ""}`.trim(),
      createdDateKey: timeParts.createdDateKey,
      createdMonthKey: timeParts.createdMonthKey,
      createdHour: timeParts.createdHour,
      createdWeekday: timeParts.createdWeekday,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const saved = await orderRef.get();
  const order = hydrateSnapshot(saved, orderRef.id);
  await refreshAnalyticsForOrder(db, order);
  await syncPublicCategoryCountsForList(db, Array.from(touchedCategoryIds));
  return order;
}

async function createPublicOrderTransactional(db, orderData) {
  return createManagedOrderTransactional(db, orderData, {
    mode: "storefront",
    channel: "storefront",
    requireCustomer: true,
    requireCity: true,
    status: ORDER_STATUS_PENDING,
    paymentMethod: "cash",
    paymentStatus: PAYMENT_STATUS_UNPAID,
  });
}

async function createPosSaleTransactional(db, orderData, sellerContext) {
  return createManagedOrderTransactional(db, orderData, {
    mode: "pos",
    channel: "pos",
    requireCustomer: false,
    requireCity: false,
    status: ORDER_STATUS_DELIVERED,
    paymentMethod: "cash",
    paymentStatus: PAYMENT_STATUS_PAID,
    soldByUserId: sellerContext?.uid || null,
    soldByUserName: sellerContext?.displayName || "",
  });
}

async function updateManagedOrderStatusTransactional(db, payload) {
  const orderId = `${payload?.orderId || payload?.id || ""}`.trim();
  const nextStatus = `${payload?.status || ""}`.trim();
  if (!orderId || !nextStatus) {
    throw new AppError("INVALID_ORDER_STATUS_UPDATE", "بيانات تحديث الحالة غير مكتملة.", 400);
  }

  const allowedStatuses = new Set([
    ORDER_STATUS_PENDING,
    ORDER_STATUS_CONFIRMED,
    ORDER_STATUS_SHIPPED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_CANCELLED,
  ]);
  if (!allowedStatuses.has(nextStatus)) {
    throw new AppError("INVALID_ORDER_STATUS", "حالة الطلب غير صالحة.", 400, { status: nextStatus });
  }

  const orderRef = db.collection("publicOrders").doc(orderId);
  const snapshot = await orderRef.get();
  if (!snapshot.exists) {
    throw new AppError("ORDER_NOT_FOUND", "تعذر العثور على الطلب المطلوب.", 404, { orderId });
  }

  const updatePayload = {
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (nextStatus === ORDER_STATUS_CONFIRMED) {
    updatePayload.confirmedAt = FieldValue.serverTimestamp();
  } else if (nextStatus === ORDER_STATUS_SHIPPED) {
    updatePayload.shippedAt = FieldValue.serverTimestamp();
  } else if (nextStatus === ORDER_STATUS_DELIVERED) {
    updatePayload.deliveredAt = FieldValue.serverTimestamp();
    updatePayload.paymentStatus = PAYMENT_STATUS_PAID;
  } else if (nextStatus === ORDER_STATUS_CANCELLED) {
    updatePayload.cancelledAt = FieldValue.serverTimestamp();
  }

  await orderRef.update(updatePayload);

  const updatedSnapshot = await orderRef.get();
  const updatedOrder = hydrateSnapshot(updatedSnapshot, orderId);
  await refreshAnalyticsForOrder(db, updatedOrder);
  return updatedOrder;
}

module.exports = {
  createManagedOrderTransactional,
  createPosSaleTransactional,
  createPublicOrderTransactional,
  findOrderByNumber,
  normalizeOrderNumberInput,
  sanitizeTrackingPayload,
  updateManagedOrderStatusTransactional,
};
