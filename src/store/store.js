import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './productsSlice';
import authReducer from './authSlice';
import suppliersReducer from './suppliersSlice';
import companyReducer from './companySlice';
import customersReducer from './customersSlice';
import transactionsReducer from './transactionsSlice';
import categoriesReducer from './categoriesSlice';
// Public Store
import publicProductsReducer from './publicProductsSlice';
import publicOrdersReducer from './publicOrdersSlice';
import deliveryCitiesReducer from './deliveryCitiesSlice';
import cartReducer from './cartSlice';

export const store = configureStore({
  reducer: {
    // Internal Inventory
    products: productsReducer,
    auth: authReducer,
    suppliers: suppliersReducer,
    company: companyReducer,
    customers: customersReducer,
    transactions: transactionsReducer,
    categories: categoriesReducer,
    // Public Store
    publicProducts: publicProductsReducer,
    publicOrders: publicOrdersReducer,
    deliveryCities: deliveryCitiesReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in state as they may contain complex data from Firestore
        // while we migrate to full serialization in services.
        ignoredPaths: [
          'auth.user',
          'products.products.lastRestockAt',
          'transactions.transactions.createdAt'
        ],
        // Ignore these actions as they may carry non-serializable payloads
        ignoredActions: [
          'products/fetchProducts/fulfilled',
          'transactions/fetchTransactions/fulfilled',
          'auth/setUserProfile'
        ],
      },
    }),
});
