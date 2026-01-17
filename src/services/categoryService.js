import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { auditService } from './auditService';
import { serializeFirestoreData } from '../utils/serialization';

const CATEGORIES_COLLECTION = 'categories';

export const categoryService = {
    // Fetch all categories
    getAllCategories: async () => {
        // Sort by name by default
        const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const categories = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(categories);
    },

    // Add a new category
    addCategory: async (categoryData) => {
        const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), categoryData);

        await auditService.logAction(
            'ADD_CATEGORY',
            docRef.id,
            categoryData.name,
            { newValue: categoryData }
        );

        return serializeFirestoreData({
            id: docRef.id,
            ...categoryData
        });
    },

    // Update a category
    updateCategory: async (id, categoryData) => {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, id);

        // Get old data for audit
        const oldDoc = await getDoc(categoryRef);
        const oldData = oldDoc.data();

        await updateDoc(categoryRef, categoryData);

        await auditService.logAction(
            'UPDATE_CATEGORY',
            id,
            categoryData.name || oldData.name,
            {
                oldValue: oldData,
                newValue: categoryData
            }
        );

        // Merge with old data to return complete object
        return serializeFirestoreData({ ...oldData, id, ...categoryData });
    },

    // Delete a category
    deleteCategory: async (id) => {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, id);

        const oldDoc = await getDoc(categoryRef);
        const oldData = oldDoc.data();

        await deleteDoc(categoryRef);

        await auditService.logAction(
            'DELETE_CATEGORY',
            id,
            oldData?.name || 'Unknown',
            { oldValue: oldData }
        );

        return id;
    }
};
