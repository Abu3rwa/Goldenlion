import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { publicOrderService } from '../services/publicOrderService';

const initialState = {
    orders: [],
    currentOrder: null,
    stats: null,
    status: 'idle',
    error: null,
};

// Async Thunks
export const fetchPublicOrders = createAsyncThunk(
    'publicOrders/fetchAll',
    async () => {
        return await publicOrderService.getAllOrders();
    }
);

export const fetchOrdersByStatus = createAsyncThunk(
    'publicOrders/fetchByStatus',
    async (status) => {
        return await publicOrderService.getOrdersByStatus(status);
    }
);

export const fetchOrderById = createAsyncThunk(
    'publicOrders/fetchById',
    async (id) => {
        return await publicOrderService.getOrderById(id);
    }
);

export const createPublicOrder = createAsyncThunk(
    'publicOrders/create',
    async (orderData) => {
        return await publicOrderService.createOrder(orderData);
    }
);

export const updateOrderStatus = createAsyncThunk(
    'publicOrders/updateStatus',
    async ({ id, status }) => {
        return await publicOrderService.updateOrderStatus(id, status);
    }
);

export const addOrderNote = createAsyncThunk(
    'publicOrders/addNote',
    async ({ id, note }) => {
        return await publicOrderService.addAdminNote(id, note);
    }
);

export const fetchOrderStats = createAsyncThunk(
    'publicOrders/fetchStats',
    async () => {
        return await publicOrderService.getOrderStats();
    }
);

const publicOrdersSlice = createSlice({
    name: 'publicOrders',
    initialState,
    reducers: {
        clearCurrentOrder: (state) => {
            state.currentOrder = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch All
            .addCase(fetchPublicOrders.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchPublicOrders.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.orders = action.payload;
            })
            .addCase(fetchPublicOrders.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Fetch By Status
            .addCase(fetchOrdersByStatus.fulfilled, (state, action) => {
                state.orders = action.payload;
            })
            // Fetch By ID
            .addCase(fetchOrderById.fulfilled, (state, action) => {
                state.currentOrder = action.payload;
            })
            // Create
            .addCase(createPublicOrder.fulfilled, (state, action) => {
                state.orders.unshift(action.payload);
                state.currentOrder = action.payload;
            })
            // Update Status
            .addCase(updateOrderStatus.fulfilled, (state, action) => {
                const index = state.orders.findIndex(o => o.id === action.payload.id);
                if (index !== -1) {
                    state.orders[index] = action.payload;
                }
                if (state.currentOrder?.id === action.payload.id) {
                    state.currentOrder = action.payload;
                }
            })
            // Add Note
            .addCase(addOrderNote.fulfilled, (state, action) => {
                const index = state.orders.findIndex(o => o.id === action.payload.id);
                if (index !== -1) {
                    state.orders[index] = action.payload;
                }
                if (state.currentOrder?.id === action.payload.id) {
                    state.currentOrder = action.payload;
                }
            })
            // Fetch Stats
            .addCase(fetchOrderStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            });
    },
});

export const { clearCurrentOrder } = publicOrdersSlice.actions;
export default publicOrdersSlice.reducer;
