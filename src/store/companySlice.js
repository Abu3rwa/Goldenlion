import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  companyName: '',
  currency: 'د.ل',
  language: 'ar',
  address: '',
  phone: '',
  terms: ''
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setCompanySettings: (state, action) => {
      state.companyName = action.payload.companyName;
      state.currency = action.payload.currency;
      state.language = action.payload.language;
      state.address = action.payload.address || '';
      state.phone = action.payload.phone || '';
      state.terms = action.payload.terms || '';
    },
    clearCompanySettings: (state) => {
      state.companyName = '';
      state.currency = 'د.ل';
      state.language = 'ar';
      state.address = '';
      state.phone = '';
      state.terms = '';
    },
  },
});

export const { setCompanySettings, clearCompanySettings } = companySlice.actions;

export default companySlice.reducer;
