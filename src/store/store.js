import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './productsSlice';
import authReducer from './authSlice';
import suppliersReducer from './suppliersSlice';
import companyReducer from './companySlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    auth: authReducer,
    suppliers: suppliersReducer,
    company: companyReducer,
  },
});
