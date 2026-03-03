const { db } = require("../utils/firestore");

/**
 * @param {{ orderNumber: string }} args
 */
async function orderStatusTool(args) {
  const raw = `${args.orderNumber || ""}`.trim();
  const candidates = Array.from(new Set([raw, raw.toUpperCase(), raw.toLowerCase()])).filter(Boolean);
  let doc = null;
  let data = null;

  for (const orderNumber of candidates) {
    const primary = await db.collection("publicOrders").where("orderNumber", "==", orderNumber).limit(1).get();
    if (!primary.empty) {
      doc = primary.docs[0];
      data = doc.data();
      break;
    }
  }

  // Backward compatibility if legacy records exist in "orders"
  if (!doc) {
    for (const orderNumber of candidates) {
      const fallback = await db.collection("orders").where("orderNumber", "==", orderNumber).limit(1).get();
      if (!fallback.empty) {
        doc = fallback.docs[0];
        data = doc.data();
        break;
      }
    }
  }

  if (!doc || !data) {
    return { type: "order_status", record: null };
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
