/**
 * Generates a short, numeric transaction ID for display purposes.
 * Format: 6 digits (e.g., 891234)
 * Note: This is not guaranteed globally unique like a UUID, but sufficient for daily display helpers.
 * It uses the last digits of the timestamp and a random component.
 */
export const generateShortId = () => {
    const now = Date.now().toString();
    // Take the last 3 digits of timestamp to capture rapid time changes
    const timeComponent = now.slice(-3);
    // Generate 3 random digits
    const randomComponent = Math.floor(Math.random() * 900) + 100;

    return `${randomComponent}${timeComponent}`;
};

/**
 * Formats a display ID with a prefix
 * @param {string} shortId 
 * @param {string} type 'IN' | 'OUT'
 */
export const formatDisplayId = (shortId, type) => {
    const prefix = type === 'STOCK_IN' ? 'IN' : 'OUT';
    return `#${shortId}`;
};
