import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const suppliersCollectionRef = collection(db, 'suppliers');

export const supplierService = {
  getAllSuppliers: async () => {
    try {
      const data = await getDocs(suppliersCollectionRef);
      return data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      throw error;
    }
  },

  addSupplier: async (supplier) => {
    try {
      const docRef = await addDoc(suppliersCollectionRef, supplier);
      return { ...supplier, id: docRef.id };
    } catch (error) {
      console.error("Error adding supplier:", error);
      throw error;
    }
  },

  updateSupplier: async (id, updatedSupplier) => {
    try {
      const supplierDoc = doc(db, 'suppliers', id);
      await updateDoc(supplierDoc, updatedSupplier);
      return { ...updatedSupplier, id };
    } catch (error) {
      console.error("Error updating supplier:", error);
      throw error;
    }
  },

  deleteSupplier: async (id) => {
    try {
      const supplierDoc = doc(db, 'suppliers', id);
      await deleteDoc(supplierDoc);
    } catch (error) {
      console.error("Error deleting supplier:", error);
      throw error;
    }
  }
};
