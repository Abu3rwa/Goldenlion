/**
 * Decimal utilities for safe financial calculations
 * All amounts stored as integers (cents) to avoid floating point errors
 */

/**
 * Convert a decimal amount to cents (integer)
 * @param {number} amount - Decimal amount (e.g., 10.50)
 * @returns {number} - Integer cents (e.g., 1050)
 */
export const toCents = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 0;
    return Math.round(amount * 100);
};

/**
 * Convert cents to decimal amount
 * @param {number} cents - Integer cents
 * @returns {number} - Decimal amount
 */
export const fromCents = (cents) => {
    if (typeof cents !== 'number' || isNaN(cents)) return 0;
    return cents / 100;
};

/**
 * Format cents for display with currency
 * @param {number} cents - Integer cents
 * @param {string} currency - Currency symbol
 * @returns {string} - Formatted string
 */
export const formatCents = (cents, currency = '') => {
    const amount = fromCents(cents);
    return `${currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`.trim();
};

/**
 * Safe multiplication for line totals
 * @param {number} quantity - Number of items
 * @param {number} priceCents - Price in cents
 * @returns {number} - Total in cents
 */
export const calculateLineTotal = (quantity, priceCents) => {
    return Math.round(quantity * priceCents);
};

/**
 * Safe addition of cents
 * @param  {...number} amounts - Amounts in cents
 * @returns {number} - Sum in cents
 */
export const addCents = (...amounts) => {
    return amounts.reduce((sum, amt) => sum + (amt || 0), 0);
};
