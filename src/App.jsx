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
import LandingPage from './pages/LandingPage';
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
import CategoriesPage from './pages/CategoriesPage';
import PrivateRoute from './components/PrivateRoute';
// Public Store Page
import StorePage from './pages/StorePage';
// Store Management Pages
import StoreDashboard from './pages/admin/store/StoreDashboard';
import StoreProducts from './pages/admin/store/StoreProducts';
import StoreProductForm from './pages/admin/store/StoreProductForm';
import StoreCities from './pages/admin/store/StoreCities';
import StoreOrders from './pages/admin/store/StoreOrders';
import Loading from './components/Loading';
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
    return <Loading />
  }

  return (
    <Router>
      <div dir="rtl" className="min-vh-100 bg-light d-flex flex-column">
        <Header />
        <main className="container-fluid py-4 px-3 px-md-4">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/store" element={<StorePage />} />

            {/* Inventory Dashboard - Owner & Accountant only */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
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
              path="/categories"
              element={
                <PrivateRoute requiredPermission="VIEW_ALL_PAGES">
                  <CategoriesPage />
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

            {/* ===== STORE MANAGEMENT ROUTES ===== */}
            <Route
              path="/admin/store"
              element={
                <PrivateRoute requiredPermission="VIEW_STORE_DASHBOARD">
                  <StoreDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/store/products"
              element={
                <PrivateRoute requiredPermission="MANAGE_PUBLIC_PRODUCTS">
                  <StoreProducts />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/store/products/new"
              element={
                <PrivateRoute requiredPermission="MANAGE_PUBLIC_PRODUCTS">
                  <StoreProductForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/store/products/:id/edit"
              element={
                <PrivateRoute requiredPermission="MANAGE_PUBLIC_PRODUCTS">
                  <StoreProductForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/store/orders"
              element={
                <PrivateRoute requiredPermission="MANAGE_PUBLIC_ORDERS">
                  <StoreOrders />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/store/cities"
              element={
                <PrivateRoute requiredPermission="MANAGE_DELIVERY_CITIES">
                  <StoreCities />
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


