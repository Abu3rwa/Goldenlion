const { makeCallable } = require("../utils/callableHandler");
const { ok } = require("../utils/response");
const { db } = require("../utils/firestore");
const { assertStoreManager } = require("../utils/auth");
const {
  createPosSaleTransactional,
  updateManagedOrderStatusTransactional,
} = require("../services/publicOrderCheckoutService");

const createPosSaleApi = makeCallable(async (request) => {
  const seller = await assertStoreManager(request);
  const payload = request?.data || {};
  const order = await createPosSaleTransactional(db, payload, seller);
  return ok({ order });
});

const updateManagedOrderStatusApi = makeCallable(async (request) => {
  await assertStoreManager(request);
  const payload = request?.data || {};
  const order = await updateManagedOrderStatusTransactional(db, payload);
  return ok({ order });
});

module.exports = {
  createPosSaleApi,
  updateManagedOrderStatusApi,
};
