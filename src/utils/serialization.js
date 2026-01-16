/**
 * Utility functions to serialize Firestore data for Redux store.
 * Redux Toolkit requires state to be serializable (no class instances like Firestore Timestamp).
 */

/**
 * Checks if a value is a Firestore Timestamp (has seconds and nanoseconds or toDate method)
 * @param {any} value 
 * @returns {boolean}
 */
const isTimestamp = (value) => {
    if (!value || typeof value !== 'object') return false;

    // Check for Firestore Timestamp properties or methods
    return (
        typeof value.toDate === 'function' ||
        (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') ||
        (typeof value._seconds === 'number' && typeof value._nanoseconds === 'number') ||
        value.constructor?.name === 'Timestamp' ||
        value._methodName === 'serverTimestamp' // Catch FieldValue sentinels
    );
};

/**
 * Recursively traverses an object/array and converts nested Firestore Timestamps to ISO strings.
 * @param {any} data The data to serialize
 * @returns {any} The serialized data
 */
export const serializeFirestoreData = (data) => {
    if (data === null || data === undefined) {
        return data;
    }

    if (isTimestamp(data)) {
        // Convert Timestamp to ISO string
        if (typeof data.toDate === 'function') {
            return data.toDate().toISOString();
        }
        
        // Handle cases where toDate might not be available but seconds are
        const seconds = data.seconds ?? data._seconds;
        if (typeof seconds === 'number') {
            return new Date(seconds * 1000).toISOString();
        }

        // Fallback for unknown object that looked like a timestamp
        return new Date().toISOString();
    }

    if (Array.isArray(data)) {
        return data.map(item => serializeFirestoreData(item));
    }

    if (typeof data === 'object') {
        const serialized = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                serialized[key] = serializeFirestoreData(data[key]);
            }
        }
        return serialized;
    }

    return data;
};
