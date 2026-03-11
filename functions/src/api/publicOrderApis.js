const { makeCallable } = require("../utils/callableHandler");
const { ok } = require("../utils/response");
const { db } = require("../utils/firestore");
const {
  createPublicOrderTransactional,
  findOrderByNumber,
  sanitizeTrackingPayload,
  normalizeOrderNumberInput,
} = require("../services/publicOrderCheckoutService");

const createPublicCheckoutOrderApi = makeCallable(async (request) => {
  const payload = request?.data || {};
  const order = await createPublicOrderTransactional(db, payload);

  return ok({
    order,
  });
});

const getPublicOrderTrackingApi = makeCallable(async (request) => {
  const payload = request?.data || {};
  const orderNumber = normalizeOrderNumberInput(payload?.orderNumber);

  const order = await findOrderByNumber(db, orderNumber, { includePos: false });
  if (!order) {
    return ok({
      found: false,
      order: null,
    });
  }

  return ok({
    found: true,
    order: sanitizeTrackingPayload(order),
  });
});

module.exports = {
  createPublicCheckoutOrderApi,
  getPublicOrderTrackingApi,
};
