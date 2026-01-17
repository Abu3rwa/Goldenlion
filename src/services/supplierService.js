import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auditService } from './auditService';
import { serializeFirestoreData } from '../utils/serialization';

const suppliersCollectionRef = collection(db, 'suppliers');

export const supplierService = {
  getAllSuppliers: async () => {
    try {
      const data = await getDocs(suppliersCollectionRef);
      const suppliers = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      return serializeFirestoreData(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      throw error;
    }
  },

  addSupplier: async (supplier) => {
    try {
      const docRef = await addDoc(suppliersCollectionRef, supplier);
      const newSupplier = { ...supplier, id: docRef.id };
      
      await auditService.logAction(
        'ADD_SUPPLIER',
        docRef.id,
        supplier.name,
        { newValue: supplier }
      );

      return serializeFirestoreData(newSupplier);
    } catch (error) {
      console.error("Error adding supplier:", error);
      throw error;
    }
  },

  updateSupplier: async (id, updatedSupplier) => {
    try {
      const supplierDoc = doc(db, 'suppliers', id);
      
      const oldDoc = await getDoc(supplierDoc);
      const oldData = oldDoc.data();

      await updateDoc(supplierDoc, updatedSupplier);

      await auditService.logAction(
        'UPDATE_SUPPLIER',
        id,
        updatedSupplier.name || oldData.name,
        { oldValue: oldData, newValue: updatedSupplier }
      );

      return serializeFirestoreData({ ...updatedSupplier, id });
    } catch (error) {
      console.error("Error updating supplier:", error);
      throw error;
    }
  },

  deleteSupplier: async (id) => {
    try {
      const supplierDoc = doc(db, 'suppliers', id);

      const oldDoc = await getDoc(supplierDoc);
      const oldData = oldDoc.data();

      await deleteDoc(supplierDoc);

      await auditService.logAction(
        'DELETE_SUPPLIER',
        id,
        oldData?.name || 'Unknown',
        { oldValue: oldData }
      );
    } catch (error) {
      console.error("Error deleting supplier:", error);
      throw error;
    }
  }
};
