import { db } from './firebaseConfig';
import {
    addDoc,
    collection,
    doc,
    getCountFromServer,
    getDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
    query,
    where,
} from 'firebase/firestore';
import { COLLECTIONS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';

const normalizeCategoryName = (name) => {
    return `${name || ''}`.trim().replace(/\s+/g, ' ');
};

const buildCategorySlug = (name) => {
    return normalizeCategoryName(name)
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-');
};

const buildCategoryLookupKey = (name) => normalizeCategoryName(name).toLowerCase();

export const publicCategoryService = {
    getAllCategories: async ({ activeOnly = true } = {}) => {
        const snapshot = await getDocs(collection(db, COLLECTIONS.PUBLIC_CATEGORIES));
        const categories = snapshot.docs
            .map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
        }))
            .filter((category) => (activeOnly ? category.active !== false : true))
            .sort((a, b) => {
                if (Number(a.sortOrder || 0) !== Number(b.sortOrder || 0)) {
                    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
                }
                return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'ar');
            });

        return serializeFirestoreData(categories);
    },

    addCategory: async (categoryData, userId) => {
        const normalizedName = normalizeCategoryName(categoryData?.name);
        if (!normalizedName) {
            throw new Error('اسم الفئة مطلوب');
        }

        const existing = await publicCategoryService.findCategoryByName(normalizedName);
        if (existing) return existing;

        const payload = {
            name: normalizedName,
            slug: buildCategorySlug(normalizedName),
            lookupKey: buildCategoryLookupKey(normalizedName),
            active: categoryData?.active !== false,
            sortOrder: Number(categoryData?.sortOrder || 0),
            productCount: 0,
            inStockCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId || null,
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.PUBLIC_CATEGORIES), payload);
        return serializeFirestoreData({ id: docRef.id, ...payload });
    },

    findCategoryByName: async (name) => {
        const normalized = normalizeCategoryName(name);
        if (!normalized) return null;

        const lookupKey = buildCategoryLookupKey(normalized);
        const q = query(
            collection(db, COLLECTIONS.PUBLIC_CATEGORIES),
            where('lookupKey', '==', lookupKey)
        );
        const snapshot = await getDocs(q);
        const existingDoc = snapshot.docs[0];
        if (!existingDoc) return null;

        return serializeFirestoreData({ id: existingDoc.id, ...existingDoc.data() });
    },

    ensureCategory: async ({ categoryId, categoryName, userId }) => {
        if (categoryId) {
            const docRef = doc(db, COLLECTIONS.PUBLIC_CATEGORIES, categoryId);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) {
                throw new Error('الفئة المحددة غير موجودة');
            }

            const category = { id: snapshot.id, ...snapshot.data() };
            return serializeFirestoreData(category);
        }

        if (!categoryName) {
            throw new Error('الفئة مطلوبة');
        }

        return publicCategoryService.addCategory({ name: categoryName }, userId);
    },

    syncCategoryCounts: async (categoryId) => {
        if (!categoryId) return null;

        const categoryRef = doc(db, COLLECTIONS.PUBLIC_CATEGORIES, categoryId);
        const categorySnapshot = await getDoc(categoryRef);
        if (!categorySnapshot.exists()) return null;

        const productsBase = collection(db, COLLECTIONS.PUBLIC_PRODUCTS);
        const allProductsQuery = query(productsBase, where('categoryId', '==', categoryId));
        const inStockQuery = query(
            productsBase,
            where('categoryId', '==', categoryId),
            where('inStock', '==', true)
        );

        const [allProductsCount, inStockCount] = await Promise.all([
            getCountFromServer(allProductsQuery),
            getCountFromServer(inStockQuery),
        ]);

        const countsPayload = {
            productCount: allProductsCount.data().count,
            inStockCount: inStockCount.data().count,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(categoryRef, countsPayload);
        return serializeFirestoreData({ id: categoryId, ...categorySnapshot.data(), ...countsPayload });
    },
};
