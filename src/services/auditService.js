import { db, auth } from './firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export const auditService = {
  /**
   * Logs a transaction to the 'audit_logs' collection.
   * 
   * @param {string} action - The type of action (e.g., 'ADD_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'SALE').
   * @param {string} entityId - The ID of the entity being modified (e.g., product ID).
   * @param {string} entityName - The name of the entity for easier reading.
   * @param {Object} details - Delta details: { field: string, oldValue: any, newValue: any } or general description.
   */
  logAction: async (action, entityId, entityName, details) => {
    try {
      const user = auth.currentUser;
      const userEmail = user ? user.email : 'system';
      const userId = user ? user.uid : 'system';

      await addDoc(collection(db, 'audit_logs'), {
        action,
        entityId,
        entityName,
        details, // This can be an array of changes or a single object
        userId,
        userEmail,
        timestamp: serverTimestamp()
      });
      
    } catch (error) {
      console.error("Critical Error: Failed to write audit log", error);
      // In a real P0 scenario, we might want to halt the operation if logging fails, 
      // but for now we'll just log to console to avoid crashing the UI.
    }
  },

  /**
   * Fetches the last N audit logs.
   * @param {number} maxLimit - Maximum number of logs to fetch.
   */
  getLogs: async (maxLimit = 50) => {
    try {
      const q = query(
        collection(db, 'audit_logs'), 
        orderBy('timestamp', 'desc'), 
        limit(maxLimit)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching audit logs", error);
      return [];
    }
  }
};
