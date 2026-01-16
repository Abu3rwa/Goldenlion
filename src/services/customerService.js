import { db, auth } from './firebaseConfig';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where
} from 'firebase/firestore';
import { COLLECTIONS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';
import { auditService } from './auditService';

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
        const customers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(customers);
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
        const newDoc = {
            ...customerData,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: {
                uid: user?.uid || 'system',
                email: user?.email || 'system'
            }
        };
        const docRef = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), newDoc);
        
        await auditService.logAction(
            'ADD_CUSTOMER',
            docRef.id,
            customerData.name,
            { newValue: customerData }
        );

        return serializeFirestoreData({
            id: docRef.id,
            ...customerData,
            isActive: true
        });
    },

    /**
     * Update customer
     */
    updateCustomer: async (id, customerData) => {
        const customerRef = doc(db, COLLECTIONS.CUSTOMERS, id);
        
        const oldDoc = await getDoc(customerRef);
        const oldData = oldDoc.data();

        await updateDoc(customerRef, {
            ...customerData,
            updatedAt: serverTimestamp()
        });

        await auditService.logAction(
            'UPDATE_CUSTOMER',
            id,
            customerData.name || oldData.name,
            { oldValue: oldData, newValue: customerData }
        );

        return serializeFirestoreData({ id, ...customerData });
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
        const customerRef = doc(db, COLLECTIONS.CUSTOMERS, id);
        const oldDoc = await getDoc(customerRef);
        const oldData = oldDoc.data();

        await deleteDoc(customerRef);

        await auditService.logAction(
            'DELETE_CUSTOMER',
            id,
            oldData?.name || 'Unknown',
            { oldValue: oldData }
        );

        return id;
    }
};
