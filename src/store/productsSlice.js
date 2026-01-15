import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '../services/productService';
import { auditService } from '../services/auditService';

const initialState = {
  products: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async Thunks
export const fetchProducts = createAsyncThunk('products/fetchProducts', async () => {
  const response = await productService.getAllProducts();
  return response;
});

export const addNewProduct = createAsyncThunk('products/addNewProduct', async (initialProduct) => {
  const response = await productService.addProduct(initialProduct);
  
  // Audit Log: Add
  await auditService.logAction(
    'ADD_PRODUCT', 
    response.id, 
    response.name, 
    { 
      initialValues: initialProduct 
    }
  );
  
  return response;
});

export const updateExistingProduct = createAsyncThunk('products/updateProduct', async (product, { getState }) => {
  const state = getState();
  const existingProduct = state.products.products.find(p => p.id === product.id);
  
  const { id, ...data } = product;
  const response = await productService.updateProduct(id, data);

  // Audit Log: Update (Delta Calculation)
  if (existingProduct) {
    const changes = [];
    if (existingProduct.name !== product.name) changes.push({ field: 'name', old: existingProduct.name, new: product.name });
    if (existingProduct.quantity !== product.quantity) changes.push({ field: 'quantity', old: existingProduct.quantity, new: product.quantity });
    if (existingProduct.price !== product.price) changes.push({ field: 'price', old: existingProduct.price, new: product.price });
    if (existingProduct.costPrice !== product.costPrice) changes.push({ field: 'costPrice', old: existingProduct.costPrice, new: product.costPrice });
    
    if (changes.length > 0) {
      await auditService.logAction(
        'UPDATE_PRODUCT',
        id,
        product.name,
        changes
      );
    }
  }

  return response;
});

export const removeProduct = createAsyncThunk('products/deleteProduct', async (productId, { getState }) => {
  const state = getState();
  const existingProduct = state.products.products.find(p => p.id === productId);
  const productName = existingProduct ? existingProduct.name : 'Unknown Product';

  await productService.deleteProduct(productId);
  
  // Audit Log: Delete
  await auditService.logAction(
    'DELETE_PRODUCT',
    productId,
    productName,
    { action: 'Deleted product permanently' }
  );
  
  return productId;
});

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Add Product
      .addCase(addNewProduct.fulfilled, (state, action) => {
        state.products.push(action.payload);
      })
      // Update Product
      .addCase(updateExistingProduct.fulfilled, (state, action) => {
        const { id, name, quantity, price, costPrice } = action.payload;
        const existingProduct = state.products.find((product) => product.id === id);
        if (existingProduct) {
          existingProduct.name = name;
          existingProduct.quantity = quantity;
          existingProduct.price = price;
          existingProduct.costPrice = costPrice;
        }
      })
      // Delete Product
      .addCase(removeProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((product) => product.id !== action.payload);
      });
  },
});

export default productsSlice.reducer;
