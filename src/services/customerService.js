import { db, auth } from './firebaseConfig';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where
} from 'firebase/firestore';
import { COLLECTIONS } from '../utils/constants';

/**
 * Customer Service - Manages shop/customer CRUD operations
 * Customers are the businessman's retail shops (B2B model)
 */
export const customerService = {
    /**
     * Get all active customers
     */
    getAllCustomers: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Get only active customers
     */
    getActiveCustomers: async () => {
        const q = query(
            collection(db, COLLECTIONS.CUSTOMERS),
            where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Add a new customer/shop
     */
    addCustomer: async (customerData) => {
        const user = auth.currentUser;
        const docRef = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), {
            ...customerData,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: {
                uid: user?.uid || 'system',
                email: user?.email || 'system'
            }
        });
        return {
            id: docRef.id,
            ...customerData,
            isActive: true
        };
    },

    /**
     * Update customer
     */
    updateCustomer: async (id, customerData) => {
        const customerRef = doc(db, COLLECTIONS.CUSTOMERS, id);
        await updateDoc(customerRef, {
            ...customerData,
            updatedAt: serverTimestamp()
        });
        return { id, ...customerData };
    },

    /**
     * Soft delete (deactivate) customer
     */
    deactivateCustomer: async (id) => {
        const customerRef = doc(db, COLLECTIONS.CUSTOMERS, id);
        await updateDoc(customerRef, {
            isActive: false,
            deactivatedAt: serverTimestamp()
        });
        return id;
    },

    /**
     * Hard delete customer
     */
    deleteCustomer: async (id) => {
        await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
        return id;
    }
};
