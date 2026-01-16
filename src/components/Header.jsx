import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { userService } from '../services/userService';
import { GiLion } from 'react-icons/gi';
import {
  MdDashboard,
  MdAddBox,
  MdLogout,
  MdHistory,
  MdPeople,
  MdSettings,
  MdStorefront,
  MdArrowDownward,
  MdArrowUpward,
  MdSwapVert,
  MdMenu,
  MdClose,
  MdSupervisorAccount
} from 'react-icons/md';
import './Header.css';

const Header = () => {
  const { user, userProfile } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const canManageInventory = userService.canPerformAction(userProfile?.role, 'MANAGE_INVENTORY');
  const canCreateTransaction = userService.canPerformAction(userProfile?.role, 'CREATE_TRANSACTION');
  const canViewAllPages = userService.canPerformAction(userProfile?.role, 'VIEW_ALL_PAGES');
  const canManageUsers = userService.canPerformAction(userProfile?.role, 'MANAGE_USERS');
  const isStaff = userProfile?.role === 'staff';

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'مالك';
      case 'accountant': return 'محاسب';
      case 'staff': return 'في الانتظار';
      default: return '';
    }
  };

  // Staff users only see minimal header
  if (user && isStaff) {
    return (
      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="brand-logo">
            <GiLion className="brand-icon" />
            <span>الأسد الذهبي</span>
          </Link>
          <div className="user-info">
            <div className="user-details">
              {userProfile?.role && (
                <span className={`user-role ${userProfile.role}`}>{getRoleLabel(userProfile.role)}</span>
              )}
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <MdLogout /> خروج
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="brand-logo">
          <GiLion className="brand-icon" />
          <span>الأسد الذهبي</span>
        </Link>

        {/* Mobile menu toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <MdClose /> : <MdMenu />}
        </button>

        <nav className={`header-nav ${mobileMenuOpen ? 'open' : ''}`}>
          {user && (
            <>
              <Link
                to="/"
                className={`nav-link ${isActive('/')}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdDashboard /> لوحة التحكم
              </Link>

              {/* Stock Operations - Accountant/Owner only */}
              {canViewAllPages && (
                <>
                  <Link
                    to="/stock-in"
                    className={`nav-link ${isActive('/stock-in')}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MdArrowDownward /> استلام
                  </Link>
                  <Link
                    to="/stock-out"
                    className={`nav-link ${isActive('/stock-out')}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MdArrowUpward /> إخراج
                  </Link>
                </>
              )}

              <Link
                to="/transactions"
                className={`nav-link ${isActive('/transactions')}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdSwapVert /> المعاملات
              </Link>

              {/* Inventory Management - Accountant/Owner only */}
              {canViewAllPages && (
                <>
                  <Link
                    to="/add"
                    className={`nav-link ${isActive('/add')}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MdAddBox /> منتج جديد
                  </Link>
                  <Link
                    to="/suppliers"
                    className={`nav-link ${isActive('/suppliers')}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MdPeople /> الموردين
                  </Link>
                  <Link
                    to="/customers"
                    className={`nav-link ${isActive('/customers')}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MdStorefront /> الفروع
                  </Link>
                </>
              )}

              <Link
                to="/audit"
                className={`nav-link ${isActive('/audit')}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdHistory /> السجل
              </Link>

              {/* User Management - Owner only */}
              {canManageUsers && (
                <Link
                  to="/users"
                  className={`nav-link ${isActive('/users')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MdSupervisorAccount /> المستخدمين
                </Link>
              )}

              <Link
                to="/settings"
                className={`nav-link ${isActive('/settings')}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdSettings /> الإعدادات
              </Link>

              <div className="user-info">
                <div className="user-details">
                  {/* <span className="user-name">{user.displayName || user.email}</span> */}
                  {userProfile?.role && (
                    <span className={`user-role ${userProfile.role}`}>{getRoleLabel(userProfile.role)}</span>
                  )}
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  <MdLogout /> خروج
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;

