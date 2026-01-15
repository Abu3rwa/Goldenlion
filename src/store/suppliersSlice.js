import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supplierService } from '../services/supplierService';
import { auditService } from '../services/auditService';

const initialState = {
  suppliers: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async Thunks
export const fetchSuppliers = createAsyncThunk('suppliers/fetchSuppliers', async () => {
  const response = await supplierService.getAllSuppliers();
  return response;
});

export const addNewSupplier = createAsyncThunk('suppliers/addNewSupplier', async (initialSupplier) => {
  const response = await supplierService.addSupplier(initialSupplier);
  
  // Audit Log
  await auditService.logAction('ADD_SUPPLIER', response.id, response.name, { initialValues: initialSupplier });
  
  return response;
});

export const updateExistingSupplier = createAsyncThunk('suppliers/updateSupplier', async (supplier, { getState }) => {
  const { id, ...data } = supplier;
  const state = getState();
  const existing = state.suppliers.suppliers.find(s => s.id === id);

  const response = await supplierService.updateSupplier(id, data);
  
  // Audit Log
  if (existing) {
      const changes = [];
      if (existing.name !== data.name) changes.push({ field: 'name', old: existing.name, new: data.name });
      if (existing.phone !== data.phone) changes.push({ field: 'phone', old: existing.phone, new: data.phone });
      // Add other fields as needed
      
      if (changes.length > 0) {
          await auditService.logAction('UPDATE_SUPPLIER', id, data.name, changes);
      }
  }

  return response;
});

export const removeSupplier = createAsyncThunk('suppliers/deleteSupplier', async (supplierId, { getState }) => {
  const state = getState();
  const existing = state.suppliers.suppliers.find(s => s.id === supplierId);
  const name = existing ? existing.name : 'Unknown';

  await supplierService.deleteSupplier(supplierId);
  
  // Audit Log
  await auditService.logAction('DELETE_SUPPLIER', supplierId, name, { action: 'Deleted supplier' });
  
  return supplierId;
});

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.suppliers = action.payload;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addNewSupplier.fulfilled, (state, action) => {
        state.suppliers.push(action.payload);
      })
      .addCase(updateExistingSupplier.fulfilled, (state, action) => {
        const { id, name, phone, address } = action.payload;
        const existingSupplier = state.suppliers.find((s) => s.id === id);
        if (existingSupplier) {
          existingSupplier.name = name;
          existingSupplier.phone = phone;
          existingSupplier.address = address;
        }
      })
      .addCase(removeSupplier.fulfilled, (state, action) => {
        state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
      });
  },
});

export default suppliersSlice.reducer;
