import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { deliveryCityService } from '../services/deliveryCityService';

const initialState = {
    cities: [],
    status: 'idle',
    error: null,
};

// Async Thunks
export const fetchAllCities = createAsyncThunk(
    'deliveryCities/fetchAll',
    async () => {
        return await deliveryCityService.getAllCities();
    }
);

export const fetchActiveCities = createAsyncThunk(
    'deliveryCities/fetchActive',
    async () => {
        return await deliveryCityService.getActiveCities();
    }
);

export const addCity = createAsyncThunk(
    'deliveryCities/add',
    async (cityData) => {
        return await deliveryCityService.addCity(cityData);
    }
);

export const updateCity = createAsyncThunk(
    'deliveryCities/update',
    async ({ id, cityData }) => {
        return await deliveryCityService.updateCity(id, cityData);
    }
);

export const deleteCity = createAsyncThunk(
    'deliveryCities/delete',
    async (id) => {
        return await deliveryCityService.deleteCity(id);
    }
);

export const toggleCityActive = createAsyncThunk(
    'deliveryCities/toggleActive',
    async ({ id, isActive }) => {
        return await deliveryCityService.toggleActive(id, isActive);
    }
);

export const seedDefaultCities = createAsyncThunk(
    'deliveryCities/seedDefaults',
    async () => {
        return await deliveryCityService.seedDefaultCities();
    }
);

const deliveryCitiesSlice = createSlice({
    name: 'deliveryCities',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch All
            .addCase(fetchAllCities.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchAllCities.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.cities = action.payload;
            })
            .addCase(fetchAllCities.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Fetch Active
            .addCase(fetchActiveCities.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchActiveCities.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.cities = action.payload;
            })
            .addCase(fetchActiveCities.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // Add
            .addCase(addCity.fulfilled, (state, action) => {
                state.cities.push(action.payload);
                state.cities.sort((a, b) => a.sortOrder - b.sortOrder);
            })
            // Update
            .addCase(updateCity.fulfilled, (state, action) => {
                const index = state.cities.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.cities[index] = action.payload;
                }
            })
            // Delete
            .addCase(deleteCity.fulfilled, (state, action) => {
                state.cities = state.cities.filter(c => c.id !== action.payload);
            })
            // Toggle Active
            .addCase(toggleCityActive.fulfilled, (state, action) => {
                const index = state.cities.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.cities[index].isActive = action.payload.isActive;
                }
            })
            // Seed Defaults
            .addCase(seedDefaultCities.fulfilled, (state, action) => {
                state.cities = [...state.cities, ...action.payload];
                state.cities.sort((a, b) => a.sortOrder - b.sortOrder);
            });
    },
});

export default deliveryCitiesSlice.reducer;
