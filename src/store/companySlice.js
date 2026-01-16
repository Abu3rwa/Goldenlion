import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  companyName: '',
  currency: '',
  language: 'en',
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setCompanySettings: (state, action) => {
      state.companyName = action.payload.companyName;
      state.currency = action.payload.currency;
      state.language = action.payload.language;
    },
    clearCompanySettings: (state) => {
      state.companyName = '';
      state.currency = '';
      state.language = 'en';
    },
  },
});

export const { setCompanySettings, clearCompanySettings } = companySlice.actions;

export default companySlice.reducer;
