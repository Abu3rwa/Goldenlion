import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { setUser, setUserProfile, clearUser } from './store/authSlice';
import { setCompanySettings } from './store/companySlice';
import { companyService } from './services/companyService';
import { userService } from './services/userService';
import { fetchProducts } from './store/productsSlice';

import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import AddProductPage from './pages/AddProductPage';
import EditProductPage from './pages/EditProductPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SuppliersPage from './pages/SuppliersPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';
import StockInPage from './pages/StockInPage';
import StockOutPage from './pages/StockOutPage';
import TransactionsPage from './pages/TransactionsPage';
import UsersPage from './pages/UsersPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        dispatch(setUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        }));

        // Fetch user profile with role
        try {
          const profile = await userService.ensureUserProfile(user);
          dispatch(setUserProfile(profile));
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        dispatch(clearUser());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    companyService.getCompanySettings().then(settings => {
      dispatch(setCompanySettings(settings));
    });
    dispatch(fetchProducts());
  }, [dispatch]);

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        marginTop: '50px',
        fontFamily: 'Tajwal, sans-serif'
      }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <Router>
      <div dir="rtl" className="min-vh-100 bg-light">
        <Header />
        <main className="container-fluid py-4 px-3 px-md-4">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/stock-in"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <StockInPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/stock-out"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <StockOutPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <PrivateRoute>
                  <TransactionsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <CustomersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/add"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <AddProductPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/edit/:id"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <EditProductPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <PrivateRoute>
                  <AuditLogsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <SuppliersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <UsersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <CompanySettingsPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;


