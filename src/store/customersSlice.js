import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { customerService } from '../services/customerService';

const initialState = {
    customers: [],
    status: 'idle',
    error: null,
};

// Async Thunks
export const fetchCustomers = createAsyncThunk(
    'customers/fetchCustomers',
    async () => {
        return await customerService.getAllCustomers();
    }
);

export const fetchActiveCustomers = createAsyncThunk(
    'customers/fetchActiveCustomers',
    async () => {
        return await customerService.getActiveCustomers();
    }
);

export const addNewCustomer = createAsyncThunk(
    'customers/addCustomer',
    async (customerData) => {
        return await customerService.addCustomer(customerData);
    }
);

export const updateExistingCustomer = createAsyncThunk(
    'customers/updateCustomer',
    async ({ id, ...customerData }) => {
        return await customerService.updateCustomer(id, customerData);
    }
);

export const removeCustomer = createAsyncThunk(
    'customers/removeCustomer',
    async (customerId) => {
        return await customerService.deactivateCustomer(customerId);
    }
);

const customersSlice = createSlice({
    name: 'customers',
    initialState,
    reducers: {
        clearCustomersError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch all customers
            .addCase(fetchCustomers.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchCustomers.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.customers = action.payload;
            })
            .addCase(fetchCustomers.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Fetch active customers
            .addCase(fetchActiveCustomers.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.customers = action.payload;
            })
            // Add customer
            .addCase(addNewCustomer.fulfilled, (state, action) => {
                state.customers.push(action.payload);
            })
            .addCase(addNewCustomer.rejected, (state, action) => {
                state.error = action.error.message;
            })
            // Update customer
            .addCase(updateExistingCustomer.fulfilled, (state, action) => {
                const index = state.customers.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.customers[index] = action.payload;
                }
            })
            // Remove customer
            .addCase(removeCustomer.fulfilled, (state, action) => {
                state.customers = state.customers.filter(c => c.id !== action.payload);
            });
    },
});

export const { clearCustomersError } = customersSlice.actions;
export default customersSlice.reducer;
