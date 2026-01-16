/**
 * Application constants to prevent magic strings
 */

export const TRANSACTION_TYPES = {
    STOCK_IN: 'STOCK_IN',
    STOCK_OUT: 'STOCK_OUT',
};

export const USER_ROLES = {
    OWNER: 'owner',
    ACCOUNTANT: 'accountant',
    STAFF: 'staff',
};

export const COLLECTIONS = {
    PRODUCTS: 'products',
    SUPPLIERS: 'suppliers',
    CUSTOMERS: 'customers',
    TRANSACTIONS: 'transactions',
    AUDIT_LOGS: 'audit_logs',
    USERS: 'users',
    INVITES: 'invites',
};
