import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { setUser, clearUser } from './store/authSlice';

import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import AddProductPage from './pages/AddProductPage';
import EditProductPage from './pages/EditProductPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SuppliersPage from './pages/SuppliersPage';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        }));
      } else {
        dispatch(clearUser());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading application...</div>;
  }

  return (
    <Router>
      <div>
        <Header />
        <main>
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
              path="/add" 
              element={
                <PrivateRoute>
                  <AddProductPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/edit/:id" 
              element={
                <PrivateRoute>
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
                <PrivateRoute>
                  <SuppliersPage />
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

