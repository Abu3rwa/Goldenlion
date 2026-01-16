import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionService } from '../services/transactionService';

const initialState = {
    transactions: [],
    status: 'idle',
    error: null,
    filters: {
        type: null,
        dateRange: null,
    },
};

// Async Thunks
export const fetchTransactions = createAsyncThunk(
    'transactions/fetchTransactions',
    async (filters = {}) => {
        return await transactionService.getTransactions(filters);
    }
);

export const createStockIn = createAsyncThunk(
    'transactions/createStockIn',
    async (data, { rejectWithValue }) => {
        try {
            return await transactionService.recordStockIn(data);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const createStockOut = createAsyncThunk(
    'transactions/createStockOut',
    async (data, { rejectWithValue }) => {
        try {
            return await transactionService.recordStockOut(data);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const addTransactionComment = createAsyncThunk(
    'transactions/addComment',
    async ({ transactionId, commentText }, { rejectWithValue }) => {
        try {
            const comment = await transactionService.addComment(transactionId, commentText);
            return { transactionId, comment };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const transactionsSlice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {
        clearTransactionsError: (state) => {
            state.error = null;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = { type: null, dateRange: null };
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch transactions
            .addCase(fetchTransactions.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchTransactions.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.transactions = action.payload;
            })
            .addCase(fetchTransactions.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Stock In
            .addCase(createStockIn.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(createStockIn.fulfilled, (state) => {
                state.status = 'succeeded';
                // Transactions will be refetched after creation
            })
            .addCase(createStockIn.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            // Stock Out
            .addCase(createStockOut.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(createStockOut.fulfilled, (state) => {
                state.status = 'succeeded';
            })
            .addCase(createStockOut.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            // Add comment
            .addCase(addTransactionComment.fulfilled, (state, action) => {
                const { transactionId, comment } = action.payload;
                const tx = state.transactions.find(t => t.id === transactionId);
                if (tx) {
                    tx.comments = [...(tx.comments || []), comment];
                }
            });
    },
});

export const { clearTransactionsError, setFilters, clearFilters } = transactionsSlice.actions;
export default transactionsSlice.reducer;
