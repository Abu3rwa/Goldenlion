import { db } from './firebaseConfig';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';

/**
 * Service for managing delivery cities
 */
export const deliveryCityService = {
    /**
     * Get all cities
     */
    getAllCities: async () => {
        const q = query(
            collection(db, COLLECTIONS.DELIVERY_CITIES)
        );
        const querySnapshot = await getDocs(q);
        const cities = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Sort in memory
        cities.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return serializeFirestoreData(cities);
    },

    /**
     * Get only active cities (for public checkout)
     */
    getActiveCities: async () => {
        const q = query(
            collection(db, COLLECTIONS.DELIVERY_CITIES)
        );
        const querySnapshot = await getDocs(q);
        const cities = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(city => city.isActive) // Filter in memory
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); // Sort in memory
        return serializeFirestoreData(cities);
    },

    /**
     * Get single city by ID
     */
    getCityById: async (id) => {
        const docRef = doc(db, COLLECTIONS.DELIVERY_CITIES, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return serializeFirestoreData({ id: docSnap.id, ...docSnap.data() });
        }
        return null;
    },

    /**
     * Add new city
     */
    addCity: async (cityData) => {
        const docRef = await addDoc(collection(db, COLLECTIONS.DELIVERY_CITIES), {
            name: cityData.name,
            nameEn: cityData.nameEn || '',
            region: cityData.region || '',
            deliveryCharge: cityData.deliveryCharge,
            estimatedDays: cityData.estimatedDays || '2-3',
            isActive: cityData.isActive !== false,
            sortOrder: cityData.sortOrder || 0,
            createdAt: serverTimestamp()
        });

        return serializeFirestoreData({
            id: docRef.id,
            ...cityData
        });
    },

    /**
     * Update city
     */
    updateCity: async (id, cityData) => {
        const cityRef = doc(db, COLLECTIONS.DELIVERY_CITIES, id);

        await updateDoc(cityRef, {
            ...cityData,
            updatedAt: serverTimestamp()
        });

        const updatedDoc = await getDoc(cityRef);
        return serializeFirestoreData({ id: updatedDoc.id, ...updatedDoc.data() });
    },

    /**
     * Delete city
     */
    deleteCity: async (id) => {
        const cityRef = doc(db, COLLECTIONS.DELIVERY_CITIES, id);
        await deleteDoc(cityRef);
        return id;
    },

    /**
     * Toggle city active status
     */
    toggleActive: async (id, isActive) => {
        const cityRef = doc(db, COLLECTIONS.DELIVERY_CITIES, id);
        await updateDoc(cityRef, {
            isActive,
            updatedAt: serverTimestamp()
        });
        return { id, isActive };
    },

    /**
     * Seed default Libyan cities
     */
    seedDefaultCities: async () => {
        const defaultCities = [
            { name: 'طرابلس', nameEn: 'Tripoli', region: 'غرب', deliveryCharge: 1500, estimatedDays: '1-2', sortOrder: 1 },
            { name: 'بنغازي', nameEn: 'Benghazi', region: 'شرق', deliveryCharge: 2500, estimatedDays: '2-3', sortOrder: 2 },
            { name: 'مصراتة', nameEn: 'Misrata', region: 'غرب', deliveryCharge: 2000, estimatedDays: '1-2', sortOrder: 3 },
            { name: 'الزاوية', nameEn: 'Zawiya', region: 'غرب', deliveryCharge: 1500, estimatedDays: '1-2', sortOrder: 4 },
            { name: 'زليتن', nameEn: 'Zliten', region: 'غرب', deliveryCharge: 1800, estimatedDays: '1-2', sortOrder: 5 },
            { name: 'الخمس', nameEn: 'Khoms', region: 'غرب', deliveryCharge: 1800, estimatedDays: '1-2', sortOrder: 6 },
            { name: 'البيضاء', nameEn: 'Al Bayda', region: 'شرق', deliveryCharge: 3000, estimatedDays: '3-4', sortOrder: 7 },
            { name: 'سرت', nameEn: 'Sirte', region: 'وسط', deliveryCharge: 2500, estimatedDays: '2-3', sortOrder: 8 },
            { name: 'سبها', nameEn: 'Sabha', region: 'جنوب', deliveryCharge: 4000, estimatedDays: '4-5', sortOrder: 9 },
            { name: 'طبرق', nameEn: 'Tobruk', region: 'شرق', deliveryCharge: 3500, estimatedDays: '3-4', sortOrder: 10 },
            { name: 'غريان', nameEn: 'Gharyan', region: 'غرب', deliveryCharge: 2000, estimatedDays: '1-2', sortOrder: 11 },
            { name: 'صبراتة', nameEn: 'Sabratha', region: 'غرب', deliveryCharge: 1800, estimatedDays: '1-2', sortOrder: 12 },
            { name: 'درنة', nameEn: 'Derna', region: 'شرق', deliveryCharge: 3500, estimatedDays: '3-4', sortOrder: 13 },
            { name: 'المرج', nameEn: 'Al Marj', region: 'شرق', deliveryCharge: 3000, estimatedDays: '3-4', sortOrder: 14 },
            { name: 'اجدابيا', nameEn: 'Ajdabiya', region: 'شرق', deliveryCharge: 2800, estimatedDays: '2-3', sortOrder: 15 },
        ];

        const results = [];
        for (const city of defaultCities) {
            const result = await deliveryCityService.addCity({ ...city, isActive: true });
            results.push(result);
        }
        return results;
    }
};
