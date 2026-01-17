import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { userService } from '../services/userService';
import { transactionService } from '../services/transactionService';
import './Header.css';
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
  MdSupervisorAccount,
  MdDescription,
  MdPictureAsPdf
} from 'react-icons/md';

const Header = () => {
  const { user, userProfile } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState([]);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  const isActive = (path) => location.pathname === path ? 'active fw-bold text-gold' : '';

  // Fetch recent receipts on mount
  useEffect(() => {
    if (user) {
      const fetchReceipts = async () => {
        try {
          // Fetch all transactions (simplified for now, ideally limit query)
          const allTx = await transactionService.getTransactions();
          const withReceipts = allTx
            .filter(tx => tx.receiptUrl)
            .slice(0, 5); // Take last 5
          setRecentReceipts(withReceipts);
        } catch (error) {
          console.error("Failed to fetch recent receipts", error);
        }
      };
      fetchReceipts();
    }
  }, [user, location.pathname]); // Refresh on navigation

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
      <header className="app-header navbar navbar-expand-lg navbar-dark shadow-sm sticky-top">
        <div className="header-container container-fluid">
          <Link to="/" className="brand-logo navbar-brand d-flex align-items-center gap-2 text-gold fw-bold">
            <GiLion className="brand-icon fs-3" />
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
    <header className="app-header navbar navbar-expand-lg navbar-dark shadow-sm sticky-top">
      <div className="header-container container-fluid">
        <Link to="/" className="brand-logo navbar-brand d-flex align-items-center gap-2 text-gold fw-bold" onClick={closeMenu}>
          <GiLion className="brand-icon fs-3" />
          <span>الأسد الذهبي</span>
        </Link>

        <button
          className="navbar-toggler mobile-menu-toggle border-0 shadow-none"
          type="button"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          <MdMenu className="fs-2" />
        </button>

        {/* Desktop Navigation */}
        <div className="collapse navbar-collapse d-none d-lg-block">
          {user && (
            <ul className="navbar-nav header-nav me-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-1">
              <li className="nav-item">
                <Link to="/" className={`nav-link ${isActive('/')}`}>
                  <MdDashboard className="ms-1" /> لوحة التحكم
                </Link>
              </li>

              {/* Stock Operations */}
              {canViewAllPages && (
                <>
                  <li className="nav-item">
                    <Link to="/stock-in" className={`nav-link ${isActive('/stock-in')}`}>
                      <MdArrowDownward className="ms-1" /> استلام
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/stock-out" className={`nav-link ${isActive('/stock-out')}`}>
                      <MdArrowUpward className="ms-1" /> إخراج
                    </Link>
                  </li>
                </>
              )}

              <li className="nav-item">
                <Link to="/transactions" className={`nav-link ${isActive('/transactions')}`}>
                  <MdSwapVert className="ms-1" /> المعاملات
                </Link>
              </li>

              {/* Inventory Management */}
              {canViewAllPages && (
                <>
                  <li className="nav-item">
                    <Link to="/add" className={`nav-link ${isActive('/add')}`}>
                      <MdAddBox className="ms-1" /> منتج جديد
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/suppliers" className={`nav-link ${isActive('/suppliers')}`}>
                      <MdPeople className="ms-1" /> الموردين
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/customers" className={`nav-link ${isActive('/customers')}`}>
                      <MdStorefront className="ms-1" /> الفروع
                    </Link>
                  </li>
                </>
              )}

              <li className="nav-item">
                <Link to="/audit" className={`nav-link ${isActive('/audit')}`}>
                  <MdHistory className="ms-1" /> السجل
                </Link>
              </li>

              {/* Recent Receipts Dropdown */}
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <MdDescription className="ms-1" /> الفواتير
                </a>
                <ul className="dropdown-menu dropdown-menu-end bg-dark border-secondary shadow-lg">
                  <li className="px-3 py-2 text-muted small border-bottom border-secondary mb-2">أحدث الفواتير</li>
                  {recentReceipts.length > 0 ? (
                    recentReceipts.map(tx => (
                      <li key={tx.id}>
                        <a 
                          className="dropdown-item text-light d-flex align-items-center gap-2" 
                          href={tx.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <MdPictureAsPdf className="text-danger" />
                          <div className="d-flex flex-column" style={{fontSize: '0.85rem'}}>
                            <span>{tx.type === 'STOCK_IN' ? 'استلام' : 'بيع'} #{tx.displayId}</span>
                            <span className="text-muted" style={{fontSize: '0.7rem'}}>
                              {new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt).toLocaleDateString('ar-LY')}
                            </span>
                          </div>
                        </a>
                      </li>
                    ))
                  ) : (
                    <li className="dropdown-item text-muted small text-center">لا توجد فواتير محفوظة</li>
                  )}
                </ul>
              </li>

              {/* User Management */}
              {canManageUsers && (
                <li className="nav-item">
                  <Link to="/users" className={`nav-link ${isActive('/users')}`}>
                    <MdSupervisorAccount className="ms-1" /> المستخدمين
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
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

        {/* Mobile Sidebar Overlay */}
        <div 
          className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} 
          onClick={closeMenu}
        />

        {/* Mobile Sidebar */}
        <div className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h5 className="text-gold m-0 fw-bold">القائمة</h5>
            <button className="btn btn-link text-white p-0" onClick={closeMenu}>
              <MdClose className="fs-2" />
            </button>
          </div>
          
          <div className="sidebar-content">
            {user && (
              <ul className="sidebar-nav">
                <li className="sidebar-item">
                  <Link to="/" className={`sidebar-link ${isActive('/')}`} onClick={closeMenu}>
                    <MdDashboard /> لوحة التحكم
                  </Link>
                </li>

                {canViewAllPages && (
                  <>
                    <li className="sidebar-section-title">حركة المخزون</li>
                    <li className="sidebar-item">
                      <Link to="/stock-in" className={`sidebar-link ${isActive('/stock-in')}`} onClick={closeMenu}>
                        <MdArrowDownward /> استلام مخزون
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/stock-out" className={`sidebar-link ${isActive('/stock-out')}`} onClick={closeMenu}>
                        <MdArrowUpward /> إخراج مخزون
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/transactions" className={`sidebar-link ${isActive('/transactions')}`} onClick={closeMenu}>
                        <MdSwapVert /> سجل المعاملات
                      </Link>
                    </li>

                    <li className="sidebar-section-title">إدارة البيانات</li>
                    <li className="sidebar-item">
                      <Link to="/add" className={`sidebar-link ${isActive('/add')}`} onClick={closeMenu}>
                        <MdAddBox /> إضافة منتج
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/suppliers" className={`sidebar-link ${isActive('/suppliers')}`} onClick={closeMenu}>
                        <MdPeople /> الموردين
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/customers" className={`sidebar-link ${isActive('/customers')}`} onClick={closeMenu}>
                        <MdStorefront /> الفروع والعملاء
                      </Link>
                    </li>
                  </>
                )}

                <li className="sidebar-section-title">الفواتير</li>
                <li className="sidebar-item">
                   <div className="d-flex flex-column gap-1 p-2">
                    {recentReceipts.length > 0 ? (
                      recentReceipts.map(tx => (
                        <a 
                          key={tx.id}
                          className="sidebar-link d-flex align-items-center gap-2"
                          style={{fontSize: '0.85rem'}}
                          href={tx.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={closeMenu}
                        >
                          <MdPictureAsPdf className="text-gold" /> 
                          {tx.type === 'STOCK_IN' ? 'استلام' : 'بيع'} #{tx.displayId}
                        </a>
                      ))
                    ) : (
                      <span className="text-muted small ps-3">لا توجد فواتير</span>
                    )}
                   </div>
                </li>

                <li className="sidebar-section-title">النظام</li>
                <li className="sidebar-item">
                  <Link to="/audit" className={`sidebar-link ${isActive('/audit')}`} onClick={closeMenu}>
                    <MdHistory /> سجل النظام
                  </Link>
                </li>

                {canManageUsers && (
                  <li className="sidebar-item">
                    <Link to="/users" className={`sidebar-link ${isActive('/users')}`} onClick={closeMenu}>
                      <MdSupervisorAccount /> إدارة المستخدمين
                    </Link>
                  </li>
                )}

                <li className="sidebar-item">
                  <Link to="/settings" className={`sidebar-link ${isActive('/settings')}`} onClick={closeMenu}>
                    <MdSettings /> الإعدادات
                  </Link>
                </li>
              </ul>
            )}

            {user && (
              <div className="sidebar-footer">
                <div className="user-profile-summary">
                  <div className="user-avatar-placeholder">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="user-info-text">
                    <span className="user-name-text">{user.displayName || 'مستخدم'}</span>
                    <span className="user-role-badge">
                      {userProfile?.role ? getRoleLabel(userProfile.role) : 'مستخدم'}
                    </span>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 mt-3">
                  <MdLogout /> <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;