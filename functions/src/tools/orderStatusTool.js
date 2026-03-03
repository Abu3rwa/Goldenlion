const { db } = require("../utils/firestore");
const { AppError } = require("../utils/appError");
const { verifyVerificationToken } = require("../utils/token");

/**
 * @param {{ orderNumber: string, verificationToken: string, sessionId: string, userId?: string|null }} args
 */
async function orderStatusTool(args) {
  if (!args.verificationToken) {
    throw new AppError("verification/required", "OTP verification is required.", 403);
  }
  const payload = verifyVerificationToken(args.verificationToken);
  if (payload.sessionId !== args.sessionId || payload.orderNumber !== args.orderNumber) {
    throw new AppError("verification/token-mismatch", "Invalid token scope.", 403);
  }

  const snapshot = await db.collection("orders").where("orderNumber", "==", args.orderNumber).limit(1).get();
  if (snapshot.empty) {
    return { type: "order_status", record: null };
  }
  const doc = snapshot.docs[0];
  const data = doc.data();

  if (payload.userId && data.userId && payload.userId !== data.userId) {
    throw new AppError("auth/order-access-denied", "Order does not belong to current user.", 403);
  }

  return {
    type: "order_status",
    record: {
      id: doc.id,
      orderNumber: data.orderNumber,
      status: data.status || "processing",
      trackingNumber: data.trackingNumber || null,
      carrier: data.carrier || null,
      eta: data.eta || null,
      createdAt: data.createdAt || null,
    },
  };
}

module.exports = { orderStatusTool };
