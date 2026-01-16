import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './productsSlice';
import authReducer from './authSlice';
import suppliersReducer from './suppliersSlice';
import companyReducer from './companySlice';
import customersReducer from './customersSlice';
import transactionsReducer from './transactionsSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    auth: authReducer,
    suppliers: suppliersReducer,
    company: companyReducer,
    customers: customersReducer,
    transactions: transactionsReducer,
  },
});
