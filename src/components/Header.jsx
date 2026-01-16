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

const Header = () => {
  const { user, userProfile } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  const isActive = (path) => location.pathname === path ? 'active fw-bold text-gold' : '';

  const handleLogout = () => {
    dispatch(logout());
    closeMenu();
  };

  const isStaff = userProfile?.role === 'staff';
  const canManageInventory = userService.canPerformAction(userProfile?.role, 'MANAGE_INVENTORY');
  const canCreateTransaction = userService.canPerformAction(userProfile?.role, 'CREATE_TRANSACTION');
  const canViewAllPages = userService.canPerformAction(userProfile?.role, 'VIEW_ALL_PAGES');
  const canManageUsers = userService.canPerformAction(userProfile?.role, 'MANAGE_USERS');

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'المالك';
      case 'accountant': return 'المحاسب';
      case 'staff': return 'موظف';
      default: return role;
    }
  };

  // Staff users only see minimal header
  if (user && isStaff) {
    return (
      <header className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-gold fw-bold">
            <GiLion className="fs-3" />
            <span>الأسد الذهبي</span>
          </Link>
          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-sm-block">
              {userProfile?.role && (
                <span className="badge bg-gold text-dark">
                  {getRoleLabel(userProfile.role)}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2">
              <MdLogout /> <span>خروج</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-gold fw-bold" onClick={closeMenu}>
          <GiLion className="fs-3" />
          <span>الأسد الذهبي</span>
        </Link>

        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <MdClose className="fs-2" /> : <MdMenu className="fs-2" />}
        </button>

        <div className={`collapse navbar-collapse ${mobileMenuOpen ? 'show' : ''}`}>
          {user && (
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-1">
              <li className="nav-item">
                <Link to="/" className={`nav-link ${isActive('/')}`} onClick={closeMenu}>
                  <MdDashboard className="ms-1" /> لوحة التحكم
                </Link>
              </li>

              {/* Stock Operations */}
              {canViewAllPages && (
                <>
                  <li className="nav-item">
                    <Link to="/stock-in" className={`nav-link ${isActive('/stock-in')}`} onClick={closeMenu}>
                      <MdArrowDownward className="ms-1" /> استلام
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/stock-out" className={`nav-link ${isActive('/stock-out')}`} onClick={closeMenu}>
                      <MdArrowUpward className="ms-1" /> إخراج
                    </Link>
                  </li>
                </>
              )}

              <li className="nav-item">
                <Link to="/transactions" className={`nav-link ${isActive('/transactions')}`} onClick={closeMenu}>
                  <MdSwapVert className="ms-1" /> المعاملات
                </Link>
              </li>

              {/* Inventory Management */}
              {canViewAllPages && (
                <>
                  <li className="nav-item">
                    <Link to="/add" className={`nav-link ${isActive('/add')}`} onClick={closeMenu}>
                      <MdAddBox className="ms-1" /> منتج جديد
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/suppliers" className={`nav-link ${isActive('/suppliers')}`} onClick={closeMenu}>
                      <MdPeople className="ms-1" /> الموردين
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/customers" className={`nav-link ${isActive('/customers')}`} onClick={closeMenu}>
                      <MdStorefront className="ms-1" /> الفروع
                    </Link>
                  </li>
                </>
              )}

              <li className="nav-item">
                <Link to="/audit" className={`nav-link ${isActive('/audit')}`} onClick={closeMenu}>
                  <MdHistory className="ms-1" /> السجل
                </Link>
              </li>

              {/* User Management */}
              {canManageUsers && (
                <li className="nav-item">
                  <Link to="/users" className={`nav-link ${isActive('/users')}`} onClick={closeMenu}>
                    <MdSupervisorAccount className="ms-1" /> المستخدمين
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <Link to="/settings" className={`nav-link ${isActive('/settings')}`} onClick={closeMenu}>
                  <MdSettings className="ms-1" /> الإعدادات
                </Link>
              </li>
            </ul>
          )}

          {user && (
            <div className="d-flex align-items-center gap-3 pt-3 pt-lg-0 border-top border-secondary mt-3 mt-lg-0 border-top-0-lg">
              <div className="d-none d-lg-block">
                {userProfile?.role && (
                  <span className="badge bg-gold text-dark">
                    {getRoleLabel(userProfile.role)}
                  </span>
                )}
              </div>
              <button onClick={handleLogout} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 px-3">
                <MdLogout /> <span>خروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

