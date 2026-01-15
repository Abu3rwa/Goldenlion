import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

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
    return {
      id: docRef.id,
      ...productData
    };
  },

  // Update a product
  updateProduct: async (id, productData) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(productRef, productData);
    return { id, ...productData };
  },

  // Delete a product
  deleteProduct: async (id) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(productRef);
    return id;
  }
};
