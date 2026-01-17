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
        const q = query(
            collection(db, COLLECTIONS.PUBLIC_PRODUCTS),
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
    }
};
