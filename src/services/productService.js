import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auditService } from './auditService';

const PRODUCTS_COLLECTION = 'products';

export const productService = {
  // Fetch all products
  getAllProducts: async () => {
    const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Add a new product
  addProduct: async (productData) => {
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productData);
    
    await auditService.logAction(
      'ADD_PRODUCT',
      docRef.id,
      productData.name,
      { newValue: productData }
    );

    return {
      id: docRef.id,
      ...productData
    };
  },

  // Update a product
  updateProduct: async (id, productData) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    
    // Get old data for audit
    const oldDoc = await getDoc(productRef);
    const oldData = oldDoc.data();

    await updateDoc(productRef, productData);

    // Calculate deltas for readable audit log
    const deltas = [];
    Object.keys(productData).forEach(key => {
      if (productData[key] !== oldData[key]) {
        deltas.push({
          field: key,
          old: oldData[key],
          new: productData[key]
        });
      }
    });

    await auditService.logAction(
      'UPDATE_PRODUCT',
      id,
      productData.name || oldData.name,
      deltas
    );

    return { id, ...productData };
  },

  // Delete a product
  deleteProduct: async (id) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    
    // Get old data for audit before deletion
    const oldDoc = await getDoc(productRef);
    const oldData = oldDoc.data();

    await deleteDoc(productRef);

    await auditService.logAction(
      'DELETE_PRODUCT',
      id,
      oldData?.name || 'Unknown',
      { oldValue: oldData }
    );

    return id;
  }
};
