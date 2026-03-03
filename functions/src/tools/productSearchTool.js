const { db } = require("../utils/firestore");

function mapProduct(doc) {
  const data = doc.data();
  return {
    id: doc.id,
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
 * @param {import("../utils/firestore").db.Firestore} dbRef
 */
async function readProductsCollection(dbRef) {
  const primary = await dbRef.collection("products").limit(80).get();
  if (!primary.empty) {
    return primary.docs.map(mapProduct);
  }
  const fallback = await dbRef.collection("publicProducts").limit(80).get();
  return fallback.docs.map(mapProduct);
}

/**
 * @param {{ query?:string, category?:string, minPrice?:number, maxPrice?:number, tags?:string[], limit?:number }} args
 */
async function productSearchTool(args) {
  const products = await readProductsCollection(db);
  const query = (args.query || "").toLowerCase();
  const category = (args.category || "").toLowerCase();
  const tags = (args.tags || []).map((t) => `${t}`.toLowerCase());
  let minPrice = Number.isFinite(args.minPrice) ? args.minPrice : 0;
  let maxPrice = Number.isFinite(args.maxPrice) ? args.maxPrice : Number.MAX_SAFE_INTEGER;
  const limit = args.limit || 4;
  const isBagCategory = ["حقائب", "حقيبة", "شنط", "شنطة", "bags", "bag"].some((k) =>
    category.includes(k)
  );

  // Auto-adjust budget filters when data is stored in cents but user budget is in main currency units.
  const priced = products.map((p) => Number(p.price || 0)).filter((p) => Number.isFinite(p) && p > 0);
  const likelyCents = priced.length > 0 && priced.some((p) => p >= 1000);
  const budgetsLookMajorUnits =
    (Number.isFinite(args.minPrice) && args.minPrice > 0 && args.minPrice < 10000) ||
    (Number.isFinite(args.maxPrice) && args.maxPrice > 0 && args.maxPrice < 10000);
  if (likelyCents && budgetsLookMajorUnits) {
    if (Number.isFinite(args.minPrice)) {
      minPrice = args.minPrice * 100;
    }
    if (Number.isFinite(args.maxPrice)) {
      maxPrice = args.maxPrice * 100;
    }
  }

  const filtered = products
    .filter((p) => p.inStock)
    .filter((p) => p.price >= minPrice && p.price <= maxPrice)
    .filter((p) => {
      if (!category) {
        return true;
      }
      const productCategory = `${p.category || ""}`.toLowerCase();
      if (productCategory.includes(category)) {
        return true;
      }
      if (isBagCategory) {
        return ["حقائب", "حقيبة", "شنط", "شنطة", "bags", "bag"].some((k) =>
          productCategory.includes(k)
        );
      }
      return false;
    })
    .filter((p) => {
      if (!tags.length) {
        return true;
      }
      const productTags = (p.tags || []).map((t) => `${t}`.toLowerCase());
      return tags.some((t) => productTags.includes(t));
    })
    .filter((p) => {
      if (!query) {
        return true;
      }
      const haystack = `${p.nameAr} ${p.nameEn} ${p.descriptionAr} ${p.descriptionEn} ${p.category}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, limit);

  return { type: "product_search", records: filtered };
}

module.exports = { productSearchTool };
