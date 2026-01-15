import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const authService = {
  loginWithEmail: async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Error signing in with Email", error);
      throw error;
    }
  },

  registerWithEmail: async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Error registering with Email", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  }
};
