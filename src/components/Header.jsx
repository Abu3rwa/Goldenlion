import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { GiLion } from 'react-icons/gi';
import { MdDashboard, MdAddBox, MdLogout, MdHistory, MdPeople, MdSettings } from 'react-icons/md';
import './Header.css';

const Header = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="brand-logo">
          <GiLion className="brand-icon" />
          <span>الأسد الذهبي</span>
        </Link>
        <nav className="header-nav">
          {user && (
            <>
              <Link to="/" className={`nav-link ${isActive('/')}`}>
                <MdDashboard /> لوحة التحكم
              </Link>
              <Link to="/add" className={`nav-link ${isActive('/add')}`}>
                <MdAddBox /> إضافة منتج
              </Link>
              <Link to="/suppliers" className={`nav-link ${isActive('/suppliers')}`}>
                <MdPeople /> الموردين
              </Link>
              <Link to="/audit" className={`nav-link ${isActive('/audit')}`}>
                <MdHistory /> السجل
              </Link>
              <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
                <MdSettings /> الإعدادات
              </Link>
              <div className="user-info">
                <span className="user-name">مرحباً، {user.displayName || 'المستخدم'}</span>
                <button onClick={handleLogout} className="logout-btn">
                  <MdLogout /> تسجيل خروج
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
