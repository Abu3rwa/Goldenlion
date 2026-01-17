import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebaseConfig";

export const storageService = {
  /**
   * Uploads a receipt PDF blob to Firebase Storage.
   * @param {Blob} blob - The PDF blob.
   * @param {string} fileName - The desired file name (e.g., txId.pdf).
   * @param {string} userId - The user ID for folder organization.
   * @returns {Promise<string>} - The public download URL.
   */
  uploadReceipt: async (blob, fileName, userId) => {
    try {
      // Path: receipts/userId/fileName
      const storageRef = ref(storage, `receipts/${userId}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading receipt:", error);
      throw error;
    }
  }
};
