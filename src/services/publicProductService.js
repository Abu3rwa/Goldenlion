import { db } from './firebaseConfig';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';

/**
 * Service for managing public store products
 */
export const publicProductService = {
    /**
     * Get all public products
     */
    getAllProducts: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.PUBLIC_PRODUCTS));
        const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Sort client-side to avoid composite index requirement
        products.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return serializeFirestoreData(products);
    },

    /**
     * Get only in-stock products (for public store)
     */
    getAvailableProducts: async () => {
        const q = query(
            collection(db, COLLECTIONS.PUBLIC_PRODUCTS),
            where('inStock', '==', true),
            orderBy('sortOrder'),
            orderBy('name')
        );
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(products);
    },

    /**
     * Get featured products for homepage
     */
    getFeaturedProducts: async () => {
        const q = query(
            collection(db, COLLECTIONS.PUBLIC_PRODUCTS),
            where('inStock', '==', true),
            where('featured', '==', true),
            orderBy('sortOrder')
        );
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(products);
    },

    /**
     * Get single product by ID
     */
    getProductById: async (id) => {
        const docRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return serializeFirestoreData({ id: docSnap.id, ...docSnap.data() });
        }
        return null;
    },

    /**
     * Add new public product
     */
    addProduct: async (productData, userId) => {
        const docRef = await addDoc(collection(db, COLLECTIONS.PUBLIC_PRODUCTS), {
            ...productData,
            images: productData.images || [],
            inStock: productData.inStock !== false,
            featured: productData.featured || false,
            sortOrder: productData.sortOrder || 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId
        });

        return serializeFirestoreData({
            id: docRef.id,
            ...productData
        });
    },

    /**
     * Update public product
     */
    updateProduct: async (id, productData) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);

        await updateDoc(productRef, {
            ...productData,
            updatedAt: serverTimestamp()
        });

        const updatedDoc = await getDoc(productRef);
        return serializeFirestoreData({ id: updatedDoc.id, ...updatedDoc.data() });
    },

    /**
     * Delete public product
     */
    deleteProduct: async (id) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        await deleteDoc(productRef);
        return id;
    },

    /**
     * Toggle product stock status
     */
    toggleStock: async (id, inStock) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        await updateDoc(productRef, {
            inStock,
            updatedAt: serverTimestamp()
        });
        return { id, inStock };
    },

    /**
     * Toggle featured status
     */
    toggleFeatured: async (id, featured) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id);
        await updateDoc(productRef, {
            featured,
            updatedAt: serverTimestamp()
        });
        return { id, featured };
    },

    /**
     * Deduct stock from color variant when order is placed
     * @param {string} productId - Product ID
     * @param {string} colorName - Color name to deduct from
     * @param {number} quantity - Quantity to deduct
     */
    deductVariantStock: async (productId, colorName, quantity) => {
        const productRef = doc(db, COLLECTIONS.PUBLIC_PRODUCTS, productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            throw new Error('Product not found');
        }

        const productData = productSnap.data();
        const colorVariants = productData.colorVariants || [];

        // Find and update the variant
        const updatedVariants = colorVariants.map(variant => {
            if (variant.color === colorName) {
                const newQty = Math.max(0, (variant.quantity || 0) - quantity);
                return { ...variant, quantity: newQty };
            }
            return variant;
        });

        // Calculate new total stock
        const newTotalStock = updatedVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);

        // Update product
        await updateDoc(productRef, {
            colorVariants: updatedVariants,
            totalStock: newTotalStock,
            inStock: newTotalStock > 0,
            updatedAt: serverTimestamp()
        });

        return {
            id: productId,
            colorVariants: updatedVariants,
            totalStock: newTotalStock,
            inStock: newTotalStock > 0
        };
    }
};
