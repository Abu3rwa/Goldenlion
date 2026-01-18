import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  MdPictureAsPdf,
  MdCategory,
  MdShoppingCart
} from 'react-icons/md';

const Header = () => {
  const { user, userProfile } = useSelector((state) => state.auth);
  const { companyName, companyNameEn } = useSelector((state) => state.company);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
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
  const canViewStore = userService.canPerformAction(userProfile?.role, 'VIEW_STORE_DASHBOARD');

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'المالك';
      case 'accountant': return 'المحاسب';
      case 'staff': return 'موظف';
      case 'sales_manager': return 'مدير المبيعات';
      default: return role;
    }
  };

  // Reusable logo content
  const LogoContent = () => (
    <>
      <GiLion className="brand-icon fs-2" />
      <div className="d-flex flex-column lh-1">
        <span className="fs-6 ">{companyName || 'الأسد الذهبي'}</span>
        {companyNameEn && <span className="small text-white-50" style={{ fontSize: '0.7em', letterSpacing: '1px' }}>{companyNameEn}</span>}
      </div>
    </>
  );

  // Hide header on landing page for non-authenticated users
  if (!user && location.pathname === '/') {
    return null;
  }

  // Staff users only see minimal header
  if (user && isStaff) {
    return (
      <header className="app-header navbar navbar-expand-lg navbar-dark shadow-sm sticky-top">
        <div className="header-container container-fluid">
          <Link to="/transactions" className="brand-logo navbar-brand d-flex align-items-center gap-2 text-gold fw-bold">
            <LogoContent />
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
          <LogoContent />
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
            <div className="d-flex align-items-center gap-2 me-auto">
              {/* Dashboard Link - Role Based */}
              {canViewAllPages ? (
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                  <MdDashboard /> لوحة التحكم
                </Link>
              ) : canViewStore ? (
                <Link to="/admin/store" className={`nav-link ${isActive('/admin/store')}`}>
                  <MdDashboard /> لوحة المبيعات
                </Link>
              ) : null}

              {/* Stock Operations Select - Inventory users only */}
              {canViewAllPages && (
                <select
                  className="nav-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(e.target.value);
                    }
                  }}
                >
                  <option value="">📦 المخزون</option>
                  <option value="/stock-in">⬇️ استلام مخزون</option>
                  <option value="/stock-out">⬆️ إخراج مخزون</option>
                  <option value="/transactions">🔄 سجل المعاملات</option>
                </select>
              )}

              {/* Data Management Select */}
              {canViewAllPages && (
                <select
                  className="nav-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(e.target.value);
                    }
                  }}
                >
                  <option value="">📋 البيانات</option>
                  <option value="/add">➕ إضافة منتج</option>
                  <option value="/categories">🏷️ التصنيفات</option>
                  <option value="/suppliers">👥 الموردين</option>
                  <option value="/customers">🏪 الفروع</option>
                </select>
              )}

              {/* Store Management Select - Owner only (sales_manager has their dashboard link) */}
              {canViewAllPages && canViewStore && (
                <select
                  className="nav-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(e.target.value);
                    }
                  }}
                >
                  <option value="">🛒 المتجر</option>
                  <option value="/admin/store">📊 لوحة المتجر</option>
                  <option value="/admin/store/products">📦 المنتجات</option>
                  <option value="/admin/store/orders">🧾 الطلبات</option>
                  <option value="/admin/store/cities">🏙️ مدن التوصيل</option>
                </select>
              )}

              {/* Sales Manager Store Select - Only for sales_manager (not owner) */}
              {canViewStore && !canViewAllPages && (
                <select
                  className="nav-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(e.target.value);
                    }
                  }}
                >
                  <option value="">🛒 إدارة المتجر</option>
                  <option value="/admin/store/products">📦 المنتجات</option>
                  <option value="/admin/store/orders">🧾 الطلبات</option>
                  <option value="/admin/store/cities">🏙️ مدن التوصيل</option>
                </select>
              )}

              {/* System Select - Only for users with VIEW_ALL_PAGES */}
              {canViewAllPages && (
                <select
                  className="nav-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(e.target.value);
                    }
                  }}
                >
                  <option value="">⚙️ النظام</option>
                  <option value="/audit">📜 سجل النظام</option>
                  {canManageUsers && <option value="/users">👤 المستخدمين</option>}
                  <option value="/settings">🔧 الإعدادات</option>
                </select>
              )}
            </div>
          )}

          {user && (
            <div className="header-user-area">
              {userProfile?.role && (
                <span className="user-role-badge">
                  {getRoleLabel(userProfile.role)}
                </span>
              )}
              <button onClick={handleLogout} className="logout-btn">
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
                {/* Role-based dashboard link */}
                {canViewAllPages ? (
                  <li className="sidebar-item">
                    <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard')}`} onClick={closeMenu}>
                      <MdDashboard /> لوحة التحكم
                    </Link>
                  </li>
                ) : canViewStore ? (
                  <li className="sidebar-item">
                    <Link to="/admin/store" className={`sidebar-link ${isActive('/admin/store')}`} onClick={closeMenu}>
                      <MdDashboard /> لوحة المبيعات
                    </Link>
                  </li>
                ) : null}

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
                      <Link to="/categories" className={`sidebar-link ${isActive('/categories')}`} onClick={closeMenu}>
                        <MdCategory /> التصنيفات
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/customers" className={`sidebar-link ${isActive('/customers')}`} onClick={closeMenu}>
                        <MdStorefront /> الفروع والعملاء
                      </Link>
                    </li>
                  </>
                )}

                {/* Receipts Section - Inventory users only */}
                {canViewAllPages && (
                  <>
                    <li className="sidebar-section-title">الفواتير</li>
                    <li className="sidebar-item">
                      <div className="d-flex flex-column gap-1 p-2">
                        {recentReceipts.length > 0 ? (
                          recentReceipts.map(tx => (
                            <a
                              key={tx.id}
                              className="sidebar-link d-flex align-items-center gap-2"
                              style={{ fontSize: '0.85rem' }}
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
                  </>
                )}

                {/* System Section - Inventory users only */}
                {canViewAllPages && (
                  <>
                    <li className="sidebar-section-title">النظام</li>
                    <li className="sidebar-item">
                      <Link to="/audit" className={`sidebar-link ${isActive('/audit')}`} onClick={closeMenu}>
                        <MdHistory /> سجل النظام
                      </Link>
                    </li>
                  </>
                )}

                {/* Store Management - Owner sees it here */}
                {canViewStore && canViewAllPages && (
                  <>
                    <li className="sidebar-section-title">إدارة المتجر</li>
                    <li className="sidebar-item">
                      <Link to="/admin/store" className={`sidebar-link ${isActive('/admin/store')}`} onClick={closeMenu}>
                        <MdShoppingCart /> لوحة المتجر
                      </Link>
                    </li>
                  </>
                )}

                {/* Store Links for Sales Manager - More detailed */}
                {canViewStore && !canViewAllPages && (
                  <>
                    <li className="sidebar-section-title">إدارة المتجر</li>
                    <li className="sidebar-item">
                      <Link to="/admin/store/products" className={`sidebar-link ${isActive('/admin/store/products')}`} onClick={closeMenu}>
                        <MdShoppingCart /> المنتجات
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/admin/store/orders" className={`sidebar-link ${isActive('/admin/store/orders')}`} onClick={closeMenu}>
                        <MdDescription /> الطلبات
                      </Link>
                    </li>
                    <li className="sidebar-item">
                      <Link to="/admin/store/cities" className={`sidebar-link ${isActive('/admin/store/cities')}`} onClick={closeMenu}>
                        <MdStorefront /> مدن التوصيل
                      </Link>
                    </li>
                  </>
                )}

                {canManageUsers && (
                  <li className="sidebar-item">
                    <Link to="/users" className={`sidebar-link ${isActive('/users')}`} onClick={closeMenu}>
                      <MdSupervisorAccount /> إدارة المستخدمين
                    </Link>
                  </li>
                )}

                {canViewAllPages && (
                  <li className="sidebar-item">
                    <Link to="/settings" className={`sidebar-link ${isActive('/settings')}`} onClick={closeMenu}>
                      <MdSettings /> الإعدادات
                    </Link>
                  </li>
                )}
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
    </header >
  );
};

export default Header;