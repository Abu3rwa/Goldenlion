const { db } = require("../utils/firestore");

/**
 * @param {{ orderNumber: string }} args
 */
async function orderStatusTool(args) {
  const snapshot = await db.collection("orders").where("orderNumber", "==", args.orderNumber).limit(1).get();
  if (snapshot.empty) {
    return { type: "order_status", record: null };
  }
  const doc = snapshot.docs[0];
  const data = doc.data();

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
