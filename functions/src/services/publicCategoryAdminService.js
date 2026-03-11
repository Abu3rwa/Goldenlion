const { FieldValue } = require("firebase-admin/firestore");

async function syncPublicCategoryCounts(db, categoryId) {
  const normalizedCategoryId = `${categoryId || ""}`.trim();
  if (!normalizedCategoryId) return null;

  const categoryRef = db.collection("publicCategories").doc(normalizedCategoryId);
  const categorySnapshot = await categoryRef.get();
  if (!categorySnapshot.exists) return null;

  const productSnapshot = await db
    .collection("publicProducts")
    .where("categoryId", "==", normalizedCategoryId)
    .get();

  const products = productSnapshot.docs.map((doc) => doc.data() || {});
  const inferInStock = (product) => {
    const colorVariants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
    const totalStock = colorVariants.length > 0
      ? colorVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant?.quantity || 0)), 0)
      : Math.max(0, Number(product.totalStock || 0));
    if (typeof product.inStock === "boolean") {
      return product.inStock;
    }
    return colorVariants.length > 0 ? totalStock > 0 : (product.totalStock != null ? totalStock > 0 : true);
  };

  const countsPayload = {
    productCount: products.length,
    inStockCount: products.filter((product) => inferInStock(product)).length,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await categoryRef.set(countsPayload, { merge: true });
  return {
    id: normalizedCategoryId,
    ...countsPayload,
  };
}

async function syncPublicCategoryCountsForList(db, categoryIds = []) {
  const uniqueCategoryIds = Array.from(
    new Set(
      categoryIds
        .map((categoryId) => `${categoryId || ""}`.trim())
        .filter(Boolean)
    )
  );

  await Promise.all(uniqueCategoryIds.map((categoryId) => syncPublicCategoryCounts(db, categoryId)));
  return uniqueCategoryIds;
}

module.exports = {
  syncPublicCategoryCounts,
  syncPublicCategoryCountsForList,
};
