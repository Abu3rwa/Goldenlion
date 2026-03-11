import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { setUser, setUserProfile, clearUser } from './store/authSlice';
import { setCompanySettings } from './store/companySlice';
import { companyService } from './services/companyService';
import { userService } from './services/userService';
import { fetchProducts } from './store/productsSlice';
import { revalidateCartItems } from './store/cartSlice';

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
import Footer from './components/Footer';
// Public Store Page
import StorePage from './pages/StorePage';
// Store Management Pages
import StoreDashboard from './pages/admin/store/StoreDashboard';
import StoreProducts from './pages/admin/store/StoreProducts';
import StoreProductForm from './pages/admin/store/StoreProductForm';
import StoreCities from './pages/admin/store/StoreCities';
import StoreOrders from './pages/admin/store/StoreOrders';
import PosPage from './pages/admin/store/PosPage';
import AnalyticsDashboard from './pages/admin/store/AnalyticsDashboard';
import CheckoutPage from './pages/CheckoutPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import Loading from './components/Loading';
import ChatWidget from './components/chat/ChatWidget';
import './App.css';

function AppShell() {
  const location = useLocation();
  const showFooter = (
    location.pathname === '/' ||
    location.pathname === '/store' ||
    location.pathname === '/login' ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/orders/')
  );

  return (
    <div dir="rtl" className="min-vh-100 bg-light d-flex flex-column">
      <Header />
         <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:orderRef" element={<OrderDetailsPage />} />

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
            path="/admin/store/orders/:orderRef"
            element={
              <PrivateRoute requiredPermission="MANAGE_PUBLIC_ORDERS">
                <OrderDetailsPage />
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
          <Route
            path="/admin/pos"
            element={
              <PrivateRoute requiredPermission="USE_POS">
                <PosPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <PrivateRoute requiredPermission="VIEW_ADVANCED_ANALYTICS">
                <AnalyticsDashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      
      {showFooter ? <Footer /> : null}
      <ChatWidget />
    </div>
  );
}

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
    dispatch(revalidateCartItems());
  }, [dispatch]);

  if (loading) {
    return <Loading />
  }

  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
