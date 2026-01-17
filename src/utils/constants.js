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
    SALES_MANAGER: 'sales_manager',
};

export const COLLECTIONS = {
    // Internal Inventory System
    PRODUCTS: 'products',
    SUPPLIERS: 'suppliers',
    CUSTOMERS: 'customers',
    TRANSACTIONS: 'transactions',
    AUDIT_LOGS: 'audit_logs',
    USERS: 'users',
    INVITES: 'invites',
    CATEGORIES: 'categories',

    // Public E-Commerce System
    PUBLIC_PRODUCTS: 'publicProducts',
    PUBLIC_CATEGORIES: 'publicCategories',
    PUBLIC_ORDERS: 'publicOrders',
    DELIVERY_CITIES: 'deliveryCities',
};

export const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
    UNPAID: 'unpaid',
    PAID: 'paid',
};
