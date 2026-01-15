import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';

const initialState = {
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const user = await authService.loginWithEmail(email, password);
  return {
    uid: user.uid,
    displayName: user.displayName || email, // Fallback to email if displayName is null
    email: user.email,
    photoURL: user.photoURL,
  };
});

export const register = createAsyncThunk('auth/register', async ({ email, password }) => {
  const user = await authService.registerWithEmail(email, password);
  return {
    uid: user.uid,
    displayName: user.displayName || email,
    email: user.email,
    photoURL: user.photoURL,
  };
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.status = 'succeeded';
    },
    clearUser: (state) => {
      state.user = null;
      state.status = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;

export default authSlice.reducer;
