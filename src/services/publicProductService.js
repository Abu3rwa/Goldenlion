import { db } from './firebaseConfig';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit as fsLimit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    startAfter,
    updateDoc,
    where,
} from 'firebase/firestore';
import { COLLECTIONS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';
import {
    applyStorefrontFilters,
    DEFAULT_STOREFRONT_FILTERS,
    requiresClientSideFiltering,
    sortStorefrontProducts,
} from '../utils/storefrontFilters';
import {
    findVariantByColor,
    hasColorVariants,
    normalizeColorKey,
} from '../utils/cartUtils';
import { publicCategoryService } from './publicCategoryService';

const sanitizeColorVariants = (variants = []) => {
    return variants.map((variant) => ({
        ...variant,
        color: `${variant?.color || ''}`.trim(),
        colorCode: variant?.colorCode || '#000000',
        colorKey: normalizeColorKey(variant?.colorKey || variant?.color),
        quantity: Math.max(0, Number(variant?.quantity || 0)),
    }));
};

const normalizeScanValue = (value) => `${value || ''}`.trim().toUpperCase();

const normalizeProductForRead = (product) => {
    const colorVariants = sanitizeColorVariants(product?.colorVariants || []);
    const hasStoredTotalStock = product?.totalStock != null && Number.isFinite(Number(product.totalStock));
    const totalStock = colorVariants.length > 0
        ? colorVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0)
        : Number(product?.totalStock ?? 0);
    const hasExplicitInStock = typeof product?.inStock === 'boolean';
    const inferredInStock = colorVariants.length > 0
        ? totalStock > 0
        : (hasStoredTotalStock ? totalStock > 0 : true);

    return {
        ...product,
        code: normalizeScanValue(product?.code),
        barcode: normalizeScanValue(product?.barcode),
        sku: `${product?.sku || ''}`.trim(),
        categoryId: product?.categoryId || '',
        categoryName: product?.categoryName || '',
        colorVariants,
        totalStock: Number.isFinite(totalStock) ? totalStock : 0,
        hasDelivery: product?.hasDelivery !== false,
        minimumStock: Math.max(0, Number(product?.minimumStock || 0)),
        reorderPoint: Math.max(0, Number(product?.reorderPoint || 0)),
        leadTimeDays: Math.max(0, Number(product?.leadTimeDays || 0)),
        preferredSupplierId: `${product?.preferredSupplierId || ''}`.trim(),
        // Keep legacy products visible when old documents do not include an inStock flag.
        inStock: hasExplicitInStock ? product.inStock : inferredInStock,
    };
};

const sanitizeProductPayload = (productData = {}) => {
    const colorVariants = sanitizeColorVariants(productData.colorVariants || []);
    const totalStock = colorVariants.length > 0
        ? colorVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0)
        : Number(productData.totalStock ?? 0);

    return {
        ...productData,
        code: normalizeScanValue(productData.code),
        barcode: normalizeScanValue(productData.barcode),
        sku: `${productData.sku || ''}`.trim(),
        name: `${productData.name || ''}`.trim(),
        nameEn: `${productData.nameEn || ''}`.trim(),
        description: `${productData.description || ''}`.trim(),
        images: Array.isArray(productData.images)
            ? productData.images.filter(Boolean)
            : [],
        categoryId: `${productData.categoryId || ''}`.trim(),
        categoryName: `${productData.categoryName || ''}`.trim(),
        colorVariants,
        totalStock: Number.isFinite(totalStock) ? totalStock : 0,
        inStock: colorVariants.length > 0
            ? totalStock > 0
            : (productData.inStock !== false),
        featured: Boolean(productData.featured),
        hasDelivery: productData.hasDelivery !== false,
        sortOrder: Number(productData.sortOrder || 0),
        minimumStock: Math.max(0, Number(productData.minimumStock || 0)),
        reorderPoint: Math.max(0, Number(productData.reorderPoint || 0)),
        leadTimeDays: Math.max(0, Number(productData.leadTimeDays || 0)),
        preferredSupplierId: `${productData.preferredSupplierId || ''}`.trim(),
    };
};

const ensureUniqueProductCode = async (code, excludeId = null) => {
    const normalizedCode = normalizeScanValue(code);
    if (!normalizedCode) return;

    const snapshot = await getDocs(collection(db, COLLECTIONS.PUBLIC_PRODUCTS));
    const conflict = snapshot.docs.find((productDoc) => {
        if (productDoc.id === excludeId) return false;
        const currentCode = normalizeScanValue(productDoc.data()?.code);
        return currentCode && currentCode === normalizedCode;
    });
    if (conflict) {
        throw new Error(`كود المنتج "${normalizedCode}" مستخدم بالفعل.`);
    }
};

const buildServerSort = (sortBy = 'default') => {
    switch (sortBy) {
        case 'price_asc':
            return [orderBy('price', 'asc'), orderBy('name', 'asc')];
        case 'price_desc':
            return [orderBy('price', 'desc'), orderBy('name', 'asc')];
        case 'newest':
            return [orderBy('createdAt', 'desc'), orderBy('name', 'asc')];
        case 'featured':
            return [orderBy('featured', 'desc'), orderBy('sortOrder', 'asc'), orderBy('name', 'asc')];
        case 'default':
        default:
            return [orderBy('sortOrder', 'asc'), orderBy('name', 'asc')];
    }
};

/**
 * Service for managing public store products
 */
export const publicProductService = {
    /**
     * Get all public products
     */
    getAllProducts: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.PUBLIC_PRODUCTS));
        const products = querySnapshot.docs.map((snapshotDoc) => normalizeProductForRead({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
        }));
        return serializeFirestoreData(sortStorefrontProducts(products, 'default'));
    },

    /**
     * Get only in-stock products (for public store)
     */
    getAvailableProducts: async () => {
        const products = await publicProductService.getAllProducts();
        return products.filter((product) => product.inStock);
    },

    /**
     * Get featured products for homepage
     */
    getFeaturedProducts: async () => {
        const products = await publicProductService.getAllProducts();
        return products.filter((product) => product.inStock && product.featured);
    },

    /**
     * Get single product by ID
     */
    getProductById: async (id) => {
        const docRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return serializeFirestoreData(normalizeProductForRead({ id: docSnap.id, ...docSnap.data() }));
        }
        return null;
    },

    /**
     * Add new public product
     */
    addProduct: async (productData, userId) => {
        const sanitized = sanitizeProductPayload(productData);
        await ensureUniqueProductCode(sanitized.code);
        const resolvedCategory = await publicCategoryService.ensureCategory({
            categoryId: sanitized.categoryId || null,
            categoryName: sanitized.categoryName || null,
            userId,
        });

        const payload = {
            ...sanitized,
            categoryId: resolvedCategory.id,
            categoryName: resolvedCategory.name,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId || null,
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.PUBLIC_PRODUCTS), payload);
        await publicCategoryService.syncCategoryCounts(resolvedCategory.id);

        return serializeFirestoreData({
            id: docRef.id,
            ...payload,
        });
    },

    /**
     * Update public product
     */
    updateProduct: async (id, productData) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        const currentSnapshot = await getDoc(productRef);
        if (!currentSnapshot.exists()) {
            throw new Error('Product not found');
        }

        const currentProduct = normalizeProductForRead({ id: currentSnapshot.id, ...currentSnapshot.data() });
        const sanitized = sanitizeProductPayload({
            ...currentProduct,
            ...productData,
        });
        await ensureUniqueProductCode(sanitized.code, id);

        const resolvedCategory = await publicCategoryService.ensureCategory({
            categoryId: sanitized.categoryId || null,
            categoryName: sanitized.categoryName || null,
        });

        const updatePayload = {
            ...sanitized,
            categoryId: resolvedCategory.id,
            categoryName: resolvedCategory.name,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(productRef, updatePayload);

        const updatedDoc = await getDoc(productRef);
        await Promise.all([
            publicCategoryService.syncCategoryCounts(currentProduct.categoryId),
            publicCategoryService.syncCategoryCounts(resolvedCategory.id),
        ]);
        return serializeFirestoreData(normalizeProductForRead({ id: updatedDoc.id, ...updatedDoc.data() }));
    },

    /**
     * Delete public product
     */
    deleteProduct: async (id) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        const currentSnapshot = await getDoc(productRef);
        const currentProduct = currentSnapshot.exists() ? currentSnapshot.data() : null;
        await deleteDoc(productRef);
        if (currentProduct?.categoryId) {
            await publicCategoryService.syncCategoryCounts(currentProduct.categoryId);
        }
        return id;
    },

    /**
     * Toggle product stock status
     */
    toggleStock: async (id, inStock) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        const productSnapshot = await getDoc(productRef);
        const currentProduct = productSnapshot.exists() ? productSnapshot.data() : null;
        await updateDoc(productRef, {
            inStock,
            updatedAt: serverTimestamp(),
        });
        if (currentProduct?.categoryId) {
            await publicCategoryService.syncCategoryCounts(currentProduct.categoryId);
        }
        return { id, inStock };
    },

    /**
     * Toggle featured status
     */
    toggleFeatured: async (id, featured) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        await updateDoc(productRef, {
            featured,
            updatedAt: serverTimestamp(),
        });
        return { id, featured };
    },

    /**
     * Firestore-backed storefront listing with query fallback for complex filter combinations.
     */
    getStorefrontProducts: async ({
        filters = DEFAULT_STOREFRONT_FILTERS,
        sortBy = 'default',
        pageSize = 12,
        cursor = null,
    } = {}) => {
        const mergedFilters = { ...DEFAULT_STOREFRONT_FILTERS, ...filters };
        const safePageSize = Math.max(1, Math.min(40, Number(pageSize || 12)));

        if (requiresClientSideFiltering(mergedFilters)) {
            return publicProductService.getStorefrontProductsFallback({
                filters: mergedFilters,
                sortBy,
                pageSize: safePageSize,
                cursor,
            });
        }

        try {
            const constraints = [];

            if (mergedFilters.category) {
                constraints.push(where('categoryId', '==', mergedFilters.category));
            }

            if (mergedFilters.featured) {
                constraints.push(where('featured', '==', true));
            }

            if (mergedFilters.inStock) {
                constraints.push(where('inStock', '==', true));
            }

            if (mergedFilters.hasDelivery) {
                constraints.push(where('hasDelivery', '==', true));
            }

            constraints.push(...buildServerSort(sortBy));

            if (cursor?.mode === 'server' && cursor.value) {
                constraints.push(startAfter(cursor.value));
            }

            constraints.push(fsLimit(safePageSize));

            const q = query(collection(db, COLLECTIONS.PUBLIC_PRODUCTS), ...constraints);
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map((snapshotDoc) => normalizeProductForRead({
                id: snapshotDoc.id,
                ...snapshotDoc.data(),
            }));

            const normalizedItems = sortStorefrontProducts(
                applyStorefrontFilters(items, mergedFilters),
                sortBy
            );

            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

            return {
                items: serializeFirestoreData(normalizedItems),
                nextCursor: lastDoc ? { mode: 'server', value: lastDoc } : null,
                hasMore: snapshot.size === safePageSize,
                mode: 'server',
            };
        } catch {
            return publicProductService.getStorefrontProductsFallback({
                filters: mergedFilters,
                sortBy,
                pageSize: safePageSize,
                cursor,
            });
        }
    },

    getStorefrontProductsFallback: async ({
        filters = DEFAULT_STOREFRONT_FILTERS,
        sortBy = 'default',
        pageSize = 12,
        cursor = null,
    } = {}) => {
        const mergedFilters = { ...DEFAULT_STOREFRONT_FILTERS, ...filters };
        const allProducts = await publicProductService.getAllProducts();
        const filtered = applyStorefrontFilters(allProducts, mergedFilters);
        const sorted = sortStorefrontProducts(filtered, sortBy);

        const offset = cursor?.mode === 'fallback' ? Number(cursor.value || 0) : 0;
        const items = sorted.slice(offset, offset + pageSize);
        const nextOffset = offset + items.length;

        return {
            items,
            nextCursor: nextOffset < sorted.length ? { mode: 'fallback', value: nextOffset } : null,
            hasMore: nextOffset < sorted.length,
            mode: 'fallback',
        };
    },

    getProductByScanValue: async (scanValue) => {
        const normalizedScan = normalizeScanValue(scanValue);
        if (!normalizedScan) return null;

        const codeSnapshot = await getDocs(query(
            collection(db, COLLECTIONS.PUBLIC_PRODUCTS),
            where('code', '==', normalizedScan),
            fsLimit(1)
        ));

        if (!codeSnapshot.empty) {
            const docSnapshot = codeSnapshot.docs[0];
            return serializeFirestoreData(normalizeProductForRead({
                id: docSnapshot.id,
                ...docSnapshot.data(),
            }));
        }

        const barcodeSnapshot = await getDocs(query(
            collection(db, COLLECTIONS.PUBLIC_PRODUCTS),
            where('barcode', '==', normalizedScan),
            fsLimit(1)
        ));

        if (!barcodeSnapshot.empty) {
            const docSnapshot = barcodeSnapshot.docs[0];
            return serializeFirestoreData(normalizeProductForRead({
                id: docSnapshot.id,
                ...docSnapshot.data(),
            }));
        }

        const allProductsSnapshot = await getDocs(collection(db, COLLECTIONS.PUBLIC_PRODUCTS));
        const fallbackMatch = allProductsSnapshot.docs.find((docSnapshot) => {
            const normalizedProduct = normalizeProductForRead({
                id: docSnapshot.id,
                ...docSnapshot.data(),
            });
            return normalizedProduct.code === normalizedScan || normalizedProduct.barcode === normalizedScan;
        });

        if (fallbackMatch) {
            return serializeFirestoreData(normalizeProductForRead({
                id: fallbackMatch.id,
                ...fallbackMatch.data(),
            }));
        }

        return null;
    },

    getPosCatalogAudit: async () => {
        const products = await publicProductService.getAllProducts();
        const codeMap = new Map();

        products.forEach((product) => {
            if (!product.code) return;
            const current = codeMap.get(product.code) || [];
            current.push(product);
            codeMap.set(product.code, current);
        });

        const duplicateCodes = Array.from(codeMap.entries())
            .filter(([, items]) => items.length > 1)
            .map(([code, items]) => ({
                code,
                products: items.map((product) => ({
                    id: product.id,
                    name: product.name,
                })),
            }));

        const missingCodes = products
            .filter((product) => !product.code)
            .map((product) => ({
                id: product.id,
                name: product.name,
            }));

        const duplicateProductIds = new Set(
            duplicateCodes.flatMap((item) => item.products.map((product) => product.id))
        );
        const readyProducts = products.filter((product) => product.code && !duplicateProductIds.has(product.id)).length;

        return {
            ready: missingCodes.length === 0 && duplicateCodes.length === 0,
            totalProducts: products.length,
            readyProducts,
            missingCodes,
            duplicateCodes,
        };
    },

    /**
     * Deduct stock for order item (variant-aware transaction).
     */
    deductStockForOrderItem: async (item) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, item.productId);

        const result = await runTransaction(db, async (transaction) => {
            const productSnapshot = await transaction.get(productRef);
            if (!productSnapshot.exists()) {
                throw new Error('Product not found');
            }

            const product = normalizeProductForRead({
                id: productSnapshot.id,
                ...productSnapshot.data(),
            });
            const orderQuantity = Math.max(0, Number(item.quantity || 0));

            if (orderQuantity <= 0) {
                return product;
            }

            if (hasColorVariants(product)) {
                const matchedVariant = findVariantByColor(product, item.selectedColor);
                if (!matchedVariant) {
                    throw new Error(`Variant not found for product ${item.productId}`);
                }

                const availableVariantQty = Math.max(0, Number(matchedVariant.quantity || 0));
                if (availableVariantQty < orderQuantity) {
                    throw new Error(`Insufficient stock for product ${item.productId}`);
                }

                const updatedVariants = product.colorVariants.map((variant) => {
                    const isSelected = normalizeColorKey(variant.colorKey || variant.color) ===
                        normalizeColorKey(matchedVariant.colorKey || matchedVariant.color);
                    if (!isSelected) return variant;

                    return {
                        ...variant,
                        quantity: Math.max(0, Number(variant.quantity || 0) - orderQuantity),
                    };
                });

                const totalStock = updatedVariants.reduce((sum, variant) => sum + Number(variant.quantity || 0), 0);

                transaction.update(productRef, {
                    colorVariants: updatedVariants,
                    totalStock,
                    inStock: totalStock > 0,
                    updatedAt: serverTimestamp(),
                });

                return {
                    ...product,
                    colorVariants: updatedVariants,
                    totalStock,
                    inStock: totalStock > 0,
                };
            }

            if (typeof product.totalStock === 'number') {
                const availableTotalStock = Math.max(0, Number(product.totalStock || 0));
                if (availableTotalStock < orderQuantity) {
                    throw new Error(`Insufficient stock for product ${item.productId}`);
                }

                const totalStock = Math.max(0, Number(product.totalStock || 0) - orderQuantity);
                transaction.update(productRef, {
                    totalStock,
                    inStock: totalStock > 0,
                    updatedAt: serverTimestamp(),
                });
                return { ...product, totalStock, inStock: totalStock > 0 };
            }

            return product;
        });

        if (result?.categoryId) {
            await publicCategoryService.syncCategoryCounts(result.categoryId);
        }

        return serializeFirestoreData(result);
    },

    /**
     * Backward-compatible variant deduction method.
     */
    deductVariantStock: async (productId, colorSelection, quantity) => {
        const selectedColor = typeof colorSelection === 'string'
            ? { color: colorSelection }
            : colorSelection;
        return publicProductService.deductStockForOrderItem({
            productId,
            selectedColor,
            quantity,
        });
    },
};
