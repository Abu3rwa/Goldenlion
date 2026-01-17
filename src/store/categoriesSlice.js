import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoryService } from '../services/categoryService';

const initialState = {
    categories: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
};

// Async Thunks
export const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
    const response = await categoryService.getAllCategories();
    return response;
});

export const addNewCategory = createAsyncThunk('categories/addNewCategory', async (initialCategory) => {
    const response = await categoryService.addCategory(initialCategory);
    return response;
});

export const updateExistingCategory = createAsyncThunk('categories/updateCategory', async (category) => {
    const { id, ...data } = category;
    const response = await categoryService.updateCategory(id, data);
    return response;
});

export const removeCategory = createAsyncThunk('categories/deleteCategory', async (categoryId) => {
    await categoryService.deleteCategory(categoryId);
    return categoryId;
});

const categoriesSlice = createSlice({
    name: 'categories',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Categories
            .addCase(fetchCategories.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.categories = action.payload;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Add Category
            .addCase(addNewCategory.fulfilled, (state, action) => {
                state.categories.push(action.payload);
                // Optimize: Sort by name after add
                state.categories.sort((a, b) => a.name.localeCompare(b.name));
            })
            // Update Category
            .addCase(updateExistingCategory.fulfilled, (state, action) => {
                const { id } = action.payload;
                const index = state.categories.findIndex((cat) => cat.id === id);
                if (index !== -1) {
                    state.categories[index] = action.payload;
                    // Optimize: Sort by name
                    state.categories.sort((a, b) => a.name.localeCompare(b.name));
                }
            })
            // Delete Category
            .addCase(removeCategory.fulfilled, (state, action) => {
                state.categories = state.categories.filter((cat) => cat.id !== action.payload);
            });
    },
});

export default categoriesSlice.reducer;
