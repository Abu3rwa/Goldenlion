const { db } = require("../utils/firestore");

function normalizeProduct(id, data = {}) {
  return {
    id,
    nameAr: data.nameAr || data.name || "",
    nameEn: data.nameEn || data.name || "",
    descriptionAr: data.descriptionAr || data.description || "",
    descriptionEn: data.descriptionEn || data.description || "",
    category: data.category || "",
    price: Number(data.price || 0),
    currency: data.currency || "LYD",
    inStock: Boolean(data.inStock),
    tags: Array.isArray(data.tags) ? data.tags : [],
    imageUrl: data.imageUrl || data.images?.[0] || "",
  };
}

/**
 * @param {{ productId: string }} args
 */
async function productByIdTool(args) {
  const doc = await db.collection("products").doc(args.productId).get();
  if (doc.exists) {
    return { type: "product", record: normalizeProduct(doc.id, doc.data()) };
  }
  const fallback = await db.collection("publicProducts").doc(args.productId).get();
  if (!fallback.exists) {
    return { type: "product", record: null };
  }
  return { type: "product", record: normalizeProduct(fallback.id, fallback.data()) };
}

module.exports = { productByIdTool };
