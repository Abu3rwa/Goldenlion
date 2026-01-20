import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

const initialState = {
  user: null,
  userProfile: null, // Includes role
  allUsers: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const user = await authService.loginWithEmail(email, password);
  // Get/create user profile with role
  const profile = await userService.ensureUserProfile(user);
  return {
    user: {
      uid: user.uid,
      displayName: user.displayName || email,
      email: user.email,
      photoURL: user.photoURL,
    },
    profile
  };
});

export const register = createAsyncThunk('auth/register', async ({ email, password, assignedRole }) => {
  const user = await authService.registerWithEmail(email, password);
  // Create user profile with role from invite (or default if not provided)
  const profile = await userService.ensureUserProfile(user, assignedRole);
  return {
    user: {
      uid: user.uid,
      displayName: user.displayName || email,
      email: user.email,
      photoURL: user.photoURL,
    },
    profile
  };
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const fetchUserProfile = createAsyncThunk('auth/fetchProfile', async (uid) => {
  return await userService.getUserProfile(uid);
});

export const fetchAllUsers = createAsyncThunk('auth/fetchAllUsers', async () => {
  return await userService.getAllUsers();
});

export const updateUserRole = createAsyncThunk(
  'auth/updateUserRole',
  async ({ userId, newRole }, { rejectWithValue }) => {
    try {
      // Legacy wrapper - converts single role to array
      return await userService.updateUserRole(userId, newRole);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserRoles = createAsyncThunk(
  'auth/updateUserRoles',
  async ({ userId, newRoles }, { rejectWithValue }) => {
    try {
      return await userService.updateUserRoles(userId, newRoles);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.status = 'succeeded';
    },
    setUserProfile: (state, action) => {
      state.userProfile = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
      state.userProfile = null;
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
        state.user = action.payload.user;
        state.userProfile = action.payload.profile;
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
        state.user = action.payload.user;
        state.userProfile = action.payload.profile;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.userProfile = null;
        state.status = 'idle';
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.userProfile = action.payload;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.allUsers = action.payload;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const { id, roles } = action.payload;
        const user = state.allUsers.find(u => u.id === id);
        if (user) {
          user.roles = roles;
        }
      })
      .addCase(updateUserRoles.fulfilled, (state, action) => {
        const { id, roles } = action.payload;
        const user = state.allUsers.find(u => u.id === id);
        if (user) {
          user.roles = roles;
        }
      });
  },
});

export const { setUser, setUserProfile, clearUser } = authSlice.actions;

export default authSlice.reducer;

