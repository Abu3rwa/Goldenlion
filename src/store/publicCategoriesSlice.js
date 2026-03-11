import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { publicCategoryService } from '../services/publicCategoryService';

const initialState = {
    categories: [],
    status: 'idle',
    error: null,
};

export const fetchPublicCategories = createAsyncThunk(
    'publicCategories/fetchAll',
    async () => {
        return await publicCategoryService.getAllCategories();
    }
);

export const addPublicCategory = createAsyncThunk(
    'publicCategories/add',
    async ({ name, userId }) => {
        return await publicCategoryService.addCategory({ name }, userId);
    }
);

const publicCategoriesSlice = createSlice({
    name: 'publicCategories',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPublicCategories.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchPublicCategories.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.categories = action.payload;
                state.error = null;
            })
            .addCase(fetchPublicCategories.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch categories';
            })
            .addCase(addPublicCategory.fulfilled, (state, action) => {
                const existingIndex = state.categories.findIndex((cat) => cat.id === action.payload.id);
                if (existingIndex !== -1) {
                    state.categories[existingIndex] = action.payload;
                } else {
                    state.categories.push(action.payload);
                }
                state.categories.sort((a, b) => {
                    if (Number(a.sortOrder || 0) !== Number(b.sortOrder || 0)) {
                        return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
                    }
                    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'ar');
                });
            });
    },
});

const selectPublicCategoriesState = (state) => state.publicCategories;
export const selectPublicCategories = createSelector(
    [selectPublicCategoriesState],
    (state) => state.categories
);
export const selectPublicCategoriesStatus = createSelector(
    [selectPublicCategoriesState],
    (state) => state.status
);

export default publicCategoriesSlice.reducer;
