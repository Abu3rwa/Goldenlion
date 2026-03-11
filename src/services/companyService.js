import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_COMPANY_SETTINGS = {
  companyName: '',
  companyNameEn: '',
  currency: 'د.ل',
  language: 'ar',
  address: '',
  phone: '',
  terms: '',
};

const DEFAULT_CHATBOT_INFO = {
  location: { address: '', city: '', googleMapsUrl: '' },
  workingHours: { weekdays: '', friday: '', saturday: '', notes: '' },
  contact: { phone: '', whatsapp: '', email: '', instagram: '', facebook: '' },
  aboutUs: '',
  delivery: '',
  payment: '',
  returnPolicy: '',
  customFaqs: [],
};

export const companyService = {
  // ─── Company Settings (invoice/general) ───
  getCompanySettings: async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'company'));
      return snap.exists() ? { ...DEFAULT_COMPANY_SETTINGS, ...snap.data() } : DEFAULT_COMPANY_SETTINGS;
    } catch (error) {
      console.error('Failed to load company settings:', error);
      return DEFAULT_COMPANY_SETTINGS;
    }
  },

  saveCompanySettings: async (settingsData) => {
    const ref = doc(db, 'settings', 'company');
    await setDoc(ref, { ...settingsData, updatedAt: serverTimestamp() }, { merge: true });
    return settingsData;
  },

  // ─── Chatbot Business Info ───
  getChatbotInfo: async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'chatbotInfo'));
      return snap.exists() ? { ...DEFAULT_CHATBOT_INFO, ...snap.data() } : DEFAULT_CHATBOT_INFO;
    } catch (error) {
      console.error('Failed to load chatbot info:', error);
      return DEFAULT_CHATBOT_INFO;
    }
  },

  saveChatbotInfo: async (data) => {
    const ref = doc(db, 'settings', 'chatbotInfo');
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return data;
  },
};
