/**
 * Input Validation Utilities
 * Provides validation functions for user inputs
 */

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: min 8 chars, at least one letter and one number
 */
export const isValidPassword = (password) => {
    if (!password || password.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
};

/**
 * Get password requirements message
 */
export const getPasswordRequirements = () => {
    return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم';
};

/**
 * Validate quantity (positive integer)
 */
export const isValidQuantity = (quantity) => {
    const num = parseInt(quantity);
    return !isNaN(num) && num > 0 && num <= 999999;
};

/**
 * Validate price (positive number, max 2 decimals)
 */
export const isValidPrice = (price) => {
    const num = parseFloat(price);
    if (isNaN(num) || num < 0) return false;
    // Check max 2 decimal places
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2 && num <= 9999999.99;
};

/**
 * Validate non-empty string with max length
 */
export const isValidString = (str, maxLength = 255) => {
    return typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

/**
 * Validate invite code format (8 alphanumeric chars)
 */
export const isValidInviteCode = (code) => {
    const regex = /^[A-Z0-9]{8}$/;
    return regex.test(code?.toUpperCase());
};

/**
 * Sanitize string input (trim and limit length)
 */
export const sanitizeString = (str, maxLength = 255) => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength);
};

/**
 * Validation error messages in Arabic
 */
export const ValidationMessages = {
    REQUIRED: 'هذا الحقل مطلوب',
    INVALID_EMAIL: 'البريد الإلكتروني غير صالح',
    INVALID_PASSWORD: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم',
    INVALID_QUANTITY: 'الكمية يجب أن تكون رقم موجب',
    INVALID_PRICE: 'السعر يجب أن يكون رقم موجب بحد أقصى رقمين عشريين',
    INVALID_INVITE_CODE: 'رمز الدعوة يجب أن يكون 8 أحرف',
    TOO_LONG: (max) => `هذا الحقل يجب أن لا يتجاوز ${max} حرف`,
};
