import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublicProducts } from '../store/publicProductsSlice';
import { addToCart, removeFromCart, updateQuantity, toggleCartOpen, selectCartItemCount } from '../store/cartSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CartDrawer from '../components/CartDrawer';
import { GiLion } from 'react-icons/gi';
import {
    MdSearch,
    MdStar,
    MdShoppingCart,
    MdDashboard,
    MdImage,
    MdLocalMall,
    MdAdd,
    MdRemove,
    MdDelete,
    MdCheck,
    MdLogin
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { userService } from '../services/userService';
import './StorePage.css';

/**
 * Public Store Page - Displays all available products for visitors
 * Features: Search, Filter, Product Details Modal, Cart, WhatsApp contact
 */
const StorePage = () => {
    const dispatch = useDispatch();
    const { products, status } = useSelector((state) => state.publicProducts);
    const { currency, phone } = useSelector((state) => state.company);
    const cartItemCount = useSelector(selectCartItemCount);

    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'featured'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchPublicProducts());
    }, [dispatch]);

    useEffect(() => {
        const openFromHash = () => {
            const hash = `${window.location.hash || ''}`;
            if (!hash.startsWith('#product-')) {
                return;
            }
            const productId = hash.replace('#product-', '').trim();
            if (!productId || !products?.length) {
                return;
            }
            const match = products.find((p) => `${p.id}` === productId);
            if (match) {
                setSelectedProduct(match);
                setIsModalOpen(true);
            }
        };

        openFromHash();
        window.addEventListener('hashchange', openFromHash);
        return () => window.removeEventListener('hashchange', openFromHash);
    }, [products]);

    // Filter and search products
    const filteredProducts = useMemo(() => {
        let result = products.filter(p => p.inStock); // Only show in-stock products

        // Apply filter
        if (filter === 'featured') {
            result = result.filter(p => p.featured);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [products, filter, searchQuery]);

    const handleWhatsAppClick = () => {
        const phoneNumber = phone || '218910000000';
        const message = encodeURIComponent('مرحباً، أرغب بالاستفسار عن المنتجات');
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        if (`${window.location.hash || ''}`.startsWith('#product-')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    };

    const handleOpenCart = () => {
        dispatch(toggleCartOpen());
    };

    // Loading state
    if (status === 'loading') {
        return (
            <div className="store-page">
                <StoreHeader cartItemCount={cartItemCount} onCartClick={handleOpenCart} />
                <div className="store-loading">
                    <div className="store-spinner"></div>
                    <p className="store-loading-text">جاري تحميل المنتجات...</p>
                </div>
                <CartDrawer />
            </div>
        );
    }

    return (
        <div className="store-page">
            {/* Header */}
            <StoreHeader cartItemCount={cartItemCount} onCartClick={handleOpenCart} />

            {/* Search & Filter Section */}
            <section className="search-section">
                <div className="search-container">
                    <div className="search-input-wrapper">
                        <MdSearch />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="ابحث عن منتج..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            <MdLocalMall /> الكل
                        </button>
                        <button
                            className={`filter-btn ${filter === 'featured' ? 'active' : ''}`}
                            onClick={() => setFilter('featured')}
                        >
                            <MdStar /> المميزة
                        </button>
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section className="products-section">
                <div className="products-header">
                    <p className="products-count">
                        عرض <strong>{filteredProducts.length}</strong> منتج
                        {searchQuery && ` لـ "${searchQuery}"`}
                    </p>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="store-empty">
                        <MdLocalMall className="store-empty-icon" />
                        <h3>لا توجد منتجات</h3>
                        <p>
                            {searchQuery
                                ? 'لم يتم العثور على منتجات تطابق بحثك'
                                : 'سيتم إضافة منتجات جديدة قريباً'}
                        </p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                currency={currency}
                                onClick={() => handleProductClick(product)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* WhatsApp Floating CTA */}
            <div className="whatsapp-cta">
                <button
                    className="whatsapp-btn"
                    onClick={handleWhatsAppClick}
                    title="تواصل معنا عبر واتساب"
                >
                    <FaWhatsapp />
                </button>
            </div>

            {/* Product Details Modal */}
            <ProductDetailsModal
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />

            {/* Cart Drawer */}
            <CartDrawer />
        </div>
    );
};

/**
 * Store Header Component with Cart Button
 */
const StoreHeader = ({ cartItemCount, onCartClick }) => {
    const { user, userProfile } = useSelector((state) => state.auth);
    const roles = userProfile?.roles || [];
    const canViewAllPages = userService.canPerformAction(roles, 'VIEW_ALL_PAGES');
    const canViewStore = userService.canPerformAction(roles, 'VIEW_STORE_DASHBOARD');

    const getRoleLabel = (role) => {
        switch (role) {
            case 'owner': return 'المالك';
            case 'accountant': return 'المحاسب';
            case 'staff': return 'موظف';
            case 'sales_manager': return 'مدير المبيعات';
            default: return role;
        }
    };

    const rolesDisplay = roles.length ? roles.map((r) => getRoleLabel(r)).join(' | ') : 'مستخدم';
    const managementPath = canViewAllPages ? '/dashboard' : (canViewStore ? '/admin/store' : null);
    const managementLabel = canViewAllPages ? 'لوحة التحكم' : 'لوحة المبيعات';

    return (
        <header className="store-header">
            {/* Top Nav Buttons */}
            <div className="store-header-nav">
                {user ? (
                    <>
                        {managementPath ? (
                            <Link to={managementPath} className="store-login-btn">
                                <MdDashboard /> {managementLabel}
                            </Link>
                        ) : null}
                        <span
                            style={{
                                background: 'rgba(212, 175, 55, 0.15)',
                                border: '1px solid rgba(212, 175, 55, 0.4)',
                                color: '#fff',
                                borderRadius: '999px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                            }}
                        >
                            {rolesDisplay}
                        </span>
                    </>
                ) : (
                    <Link to="/login" className="store-login-btn">
                        <MdLogin /> تسجيل الدخول
                    </Link>
                )}
                <button className="store-cart-btn" onClick={onCartClick}>
                    <MdShoppingCart />
                    {cartItemCount > 0 && (
                        <span className="store-cart-count">{cartItemCount}</span>
                    )}
                </button>
            </div>

            {/* Brand Content */}
            <div className="store-header-content">
                <GiLion style={{ fontSize: '4rem', color: '#D4AF37', marginBottom: '0.5rem' }} />
                <h1 className="store-title">متجر  مجموعةالأسد الذهبي</h1>
                <p className="store-subtitle">أفخم الشنط والمحافظ بأسعار منافسة</p>
            </div>
        </header>
    );
};

/**
 * Product Card Component - Click to open details
 */
const ProductCard = ({ product, currency, onClick }) => {
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cart.items);
    const [justAdded, setJustAdded] = useState(false);

    const cartItem = cartItems.find(item => item.productId === product.id);
    const quantity = cartItem ? cartItem.quantity : 0;

    const handleQuickAdd = (e) => {
        e.stopPropagation();
        dispatch(addToCart({ product, quantity: 1 }));
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
    };

    const handleIncrease = (e) => {
        e.stopPropagation();
        dispatch(updateQuantity({ productId: product.id, quantity: quantity + 1 }));
    };

    const handleDecrease = (e) => {
        e.stopPropagation();
        if (quantity > 1) {
            dispatch(updateQuantity({ productId: product.id, quantity: quantity - 1 }));
        } else {
            dispatch(removeFromCart(product.id));
        }
    };

    return (
        <article
            className={`product-card ${!product.inStock ? 'out-of-stock' : ''}`}
            onClick={onClick}
        >
            {/* Product Image */}
            <div className="product-card-image-wrapper">
                {product.images?.[0] ? (
                    <img
                        src={product.images[0]}
                        alt={product.name}
                        className="product-card-image"
                        loading="lazy"
                    />
                ) : (
                    <div className="product-card-placeholder">
                        <MdImage />
                    </div>
                )}

                {/* Badges */}
                <div className="product-card-badges">
                    {product.featured && (
                        <span className="product-badge featured">
                            <MdStar /> مميز
                        </span>
                    )}
                    {!product.inStock && (
                        <span className="product-badge out-of-stock">
                            غير متوفر
                        </span>
                    )}
                </div>

                {/* Quick Add Button (on hover) - Only show if not in cart yet to avoid confusion */}
                {product.inStock && quantity === 0 && (
                    <button
                        className={`quick-add-btn ${justAdded ? 'added' : ''}`}
                        onClick={handleQuickAdd}
                        title="أضف للسلة"
                    >
                        {justAdded ? <MdCheck /> : <MdAdd />}
                    </button>
                )}
            </div>

            {/* Product Content */}
            <div className="product-card-content">
                <h3 className="product-card-name">{product.name}</h3>
                {product.description && (
                    <p className="product-card-description">{product.description}</p>
                )}

                <div className="product-card-footer">
                    <span className="product-card-price">
                        {formatCurrency(fromCents(product.price), currency)}
                    </span>

                    {product.inStock ? (
                        quantity > 0 ? (
                            <div className="product-card-qty-control" onClick={(e) => e.stopPropagation()}>
                                <button className="qty-control-btn minus" onClick={handleDecrease}>
                                    {quantity === 1 ? <MdDelete /> : <MdRemove />}
                                </button>
                                <span className="qty-control-value">{quantity}</span>
                                <button className="qty-control-btn plus" onClick={handleIncrease}>
                                    <MdAdd />
                                </button>
                            </div>
                        ) : (
                            <button
                                className="product-card-action add-to-cart"
                                onClick={handleQuickAdd}
                            >
                                <MdShoppingCart />
                                أضف للسلة
                            </button>
                        )
                    ) : (
                        <span className="product-card-action out-of-stock">
                            غير متوفر
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
};

export default StorePage;
