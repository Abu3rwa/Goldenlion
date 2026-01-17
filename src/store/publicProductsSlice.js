import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { publicProductService } from '../services/publicProductService';

const initialState = {
    products: [],
    featuredProducts: [],
    currentProduct: null,
    status: 'idle',
    error: null,
};

// Async Thunks
export const fetchPublicProducts = createAsyncThunk(
    'publicProducts/fetchAll',
    async () => {
        return await publicProductService.getAllProducts();
    }
);

export const fetchAvailableProducts = createAsyncThunk(
    'publicProducts/fetchAvailable',
    async () => {
        return await publicProductService.getAvailableProducts();
    }
);

export const fetchFeaturedProducts = createAsyncThunk(
    'publicProducts/fetchFeatured',
    async () => {
        return await publicProductService.getFeaturedProducts();
    }
);

export const fetchPublicProductById = createAsyncThunk(
    'publicProducts/fetchById',
    async (id) => {
        return await publicProductService.getProductById(id);
    }
);

export const addPublicProduct = createAsyncThunk(
    'publicProducts/add',
    async ({ productData, userId }) => {
        return await publicProductService.addProduct(productData, userId);
    }
);

export const updatePublicProduct = createAsyncThunk(
    'publicProducts/update',
    async ({ id, productData }) => {
        return await publicProductService.updateProduct(id, productData);
    }
);

export const deletePublicProduct = createAsyncThunk(
    'publicProducts/delete',
    async (id) => {
        return await publicProductService.deleteProduct(id);
    }
);

export const toggleProductStock = createAsyncThunk(
    'publicProducts/toggleStock',
    async ({ id, inStock }) => {
        return await publicProductService.toggleStock(id, inStock);
    }
);

export const toggleProductFeatured = createAsyncThunk(
    'publicProducts/toggleFeatured',
    async ({ id, featured }) => {
        return await publicProductService.toggleFeatured(id, featured);
    }
);

const publicProductsSlice = createSlice({
    name: 'publicProducts',
    initialState,
    reducers: {
        clearCurrentProduct: (state) => {
            state.currentProduct = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch All
            .addCase(fetchPublicProducts.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchPublicProducts.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.products = action.payload;
            })
            .addCase(fetchPublicProducts.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Fetch Available
            .addCase(fetchAvailableProducts.fulfilled, (state, action) => {
                state.products = action.payload;
            })
            // Fetch Featured
            .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
                state.featuredProducts = action.payload;
            })
            // Fetch By ID
            .addCase(fetchPublicProductById.fulfilled, (state, action) => {
                state.currentProduct = action.payload;
            })
            // Add
            .addCase(addPublicProduct.fulfilled, (state, action) => {
                state.products.push(action.payload);
            })
            // Update
            .addCase(updatePublicProduct.fulfilled, (state, action) => {
                const index = state.products.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.products[index] = action.payload;
                }
                if (state.currentProduct?.id === action.payload.id) {
                    state.currentProduct = action.payload;
                }
            })
            // Delete
            .addCase(deletePublicProduct.fulfilled, (state, action) => {
                state.products = state.products.filter(p => p.id !== action.payload);
            })
            // Toggle Stock
            .addCase(toggleProductStock.fulfilled, (state, action) => {
                const index = state.products.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.products[index].inStock = action.payload.inStock;
                }
            })
            // Toggle Featured
            .addCase(toggleProductFeatured.fulfilled, (state, action) => {
                const index = state.products.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.products[index].featured = action.payload.featured;
                }
            });
    },
});

export const { clearCurrentProduct } = publicProductsSlice.actions;
export default publicProductsSlice.reducer;
