import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    addToCart,
    removeFromCart,
    selectCartItemCount,
    updateQuantity,
    toggleCartOpen,
} from '../store/cartSlice';
import {
    fetchPublicCategories,
    selectPublicCategories,
    selectPublicCategoriesStatus,
} from '../store/publicCategoriesSlice';
import { publicProductService } from '../services/publicProductService';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import {
    buildCategoryCounts,
    buildColorOptions,
    buildStorefrontSearchParams,
    hasActiveStorefrontFilters,
    parseStorefrontFilters,
    STORE_SORT_OPTIONS,
} from '../utils/storefrontFilters';
import { buildCartKey, hasColorVariants } from '../utils/cartUtils';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CartDrawer from '../components/CartDrawer';
import { GiLion } from 'react-icons/gi';
import {
    MdAdd,
    MdCheck,
    MdColorLens,
    MdDashboard,
    MdDelete,
    MdImage,
    MdLocalMall,
    MdLogin,
    MdRemove,
    MdSearch,
    MdShoppingCart,
    MdStar,
    MdTune,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { userService } from '../services/userService';
import './StorePage.css';

const PAGE_SIZE = 12;

const StorePage = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = useMemo(() => parseStorefrontFilters(searchParams), [searchParams]);
    const categories = useSelector(selectPublicCategories);
    const categoriesStatus = useSelector(selectPublicCategoriesStatus);
    const categoriesError = useSelector((state) => state.publicCategories.error);
    const { currency, phone } = useSelector((state) => state.company);
    const cartItemCount = useSelector(selectCartItemCount);

    const [searchInput, setSearchInput] = useState(filters.search);
    const [products, setProducts] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [status, setStatus] = useState('loading');
    const [loadMoreStatus, setLoadMoreStatus] = useState('idle');
    const [error, setError] = useState('');
    const [queryMode, setQueryMode] = useState('server');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const latestRequestRef = useRef(0);

    const filterKey = useMemo(
        () => buildStorefrontSearchParams(filters).toString(),
        [filters]
    );

    const updateFiltersInUrl = useCallback((patch, { replace = false } = {}) => {
        const next = {
            ...filters,
            ...patch,
        };
        const params = buildStorefrontSearchParams(next);
        setSearchParams(params, { replace });
    }, [filters, setSearchParams]);

    const fetchProducts = useCallback(async ({ append = false, cursorOverride = null } = {}) => {
        const requestId = latestRequestRef.current + 1;
        latestRequestRef.current = requestId;

        if (append) {
            setLoadMoreStatus('loading');
        } else {
            setStatus('loading');
            setError('');
        }

        try {
            const result = await publicProductService.getStorefrontProducts({
                filters,
                sortBy: filters.sort,
                pageSize: PAGE_SIZE,
                cursor: append ? (cursorOverride || cursor) : null,
            });

            if (latestRequestRef.current !== requestId) {
                return;
            }

            setProducts((prev) => append ? [...prev, ...result.items] : result.items);
            setCursor(result.nextCursor || null);
            setHasMore(Boolean(result.hasMore));
            setQueryMode(result.mode || 'server');
            setStatus('succeeded');
        } catch (fetchError) {
            if (latestRequestRef.current !== requestId) {
                return;
            }

            setStatus('failed');
            setError(fetchError?.message || 'فشل تحميل المنتجات');
        } finally {
            if (append) {
                setLoadMoreStatus('idle');
            }
        }
    }, [cursor, filters]);

    useEffect(() => {
        dispatch(fetchPublicCategories());
    }, [dispatch]);

    useEffect(() => {
        setSearchInput(filters.search);
    }, [filters.search]);

    useEffect(() => {
        setCursor(null);
        setHasMore(false);
        fetchProducts({ append: false });
    }, [fetchProducts, filterKey]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            if (searchInput !== filters.search) {
                updateFiltersInUrl({ search: searchInput }, { replace: true });
            }
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [filters.search, searchInput, updateFiltersInUrl]);

    useEffect(() => {
        const openFromHash = () => {
            const hash = `${window.location.hash || ''}`;
            if (!hash.startsWith('#product-')) return;

            const productId = hash.replace('#product-', '').trim();
            if (!productId || !products.length) return;

            const matchedProduct = products.find((product) => `${product.id}` === productId);
            if (matchedProduct) {
                setSelectedProduct(matchedProduct);
                setIsModalOpen(true);
            }
        };

        openFromHash();
        window.addEventListener('hashchange', openFromHash);
        return () => window.removeEventListener('hashchange', openFromHash);
    }, [products]);

    const categoryCounts = useMemo(() => buildCategoryCounts(products), [products]);
    const colorOptions = useMemo(() => buildColorOptions(products), [products]);
    const hasAnyActiveFilter = useMemo(() => hasActiveStorefrontFilters(filters), [filters]);

    const handleWhatsAppClick = () => {
        const phoneNumber = phone || '218931169753';
        const message = encodeURIComponent('مرحباً، أرغب بالاستفسار عن المنتجات');
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    const handleProductOpen = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
        window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}#product-${product.id}`
        );
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        if (`${window.location.hash || ''}`.startsWith('#product-')) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    };

    const handleLoadMore = () => {
        if (!hasMore || loadMoreStatus === 'loading') return;
        fetchProducts({ append: true, cursorOverride: cursor });
    };

    const clearAllFilters = () => {
        setSearchInput('');
        setSearchParams(new URLSearchParams());
    };

    return (
        <div className="store-page">
            <StoreHeader cartItemCount={cartItemCount} onCartClick={() => dispatch(toggleCartOpen())} />

            <section className="search-section">
                <div className="search-container search-container-advanced">
                    <div className="search-input-wrapper">
                        <MdSearch />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="ابحث عن منتج..."
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                    </div>

                    <div className="filter-row">
                        <div className="sort-select-wrapper">
                            <label className="filter-label">
                                <MdTune /> الترتيب
                            </label>
                            <select
                                className="filter-select"
                                value={filters.sort}
                                onChange={(event) => updateFiltersInUrl({ sort: event.target.value })}
                            >
                                {STORE_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="toggle-filters">
                            <button
                                className={`filter-btn ${filters.featured ? 'active' : ''}`}
                                onClick={() => updateFiltersInUrl({ featured: !filters.featured })}
                            >
                                <MdStar /> المميزة
                            </button>
                            <button
                                className={`filter-btn ${filters.inStock ? 'active' : ''}`}
                                onClick={() => updateFiltersInUrl({ inStock: !filters.inStock })}
                            >
                                <MdLocalMall /> متوفر فقط
                            </button>
                            <button
                                className={`filter-btn ${filters.hasDelivery ? 'active' : ''}`}
                                onClick={() => updateFiltersInUrl({ hasDelivery: !filters.hasDelivery })}
                            >
                                توصيل
                            </button>
                        </div>
                    </div>

                    <div className="filter-row">
                        <div className="price-range-group">
                            <label className="filter-label">السعر (من - إلى)</label>
                            <div className="price-range-inputs">
                                <input
                                    type="number"
                                    min="0"
                                    className="filter-input"
                                    placeholder="من"
                                    value={filters.minPrice}
                                    onChange={(event) => updateFiltersInUrl({ minPrice: event.target.value }, { replace: true })}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    className="filter-input"
                                    placeholder="إلى"
                                    value={filters.maxPrice}
                                    onChange={(event) => updateFiltersInUrl({ maxPrice: event.target.value }, { replace: true })}
                                />
                            </div>
                        </div>

                        <div className="color-filter-group">
                            <label className="filter-label">
                                <MdColorLens /> اللون
                            </label>
                            <select
                                className="filter-select"
                                value={filters.color}
                                onChange={(event) => updateFiltersInUrl({ color: event.target.value })}
                            >
                                <option value="">كل الألوان</option>
                                {colorOptions.map((color) => (
                                    <option key={color.key} value={color.key}>
                                        {color.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {hasAnyActiveFilter && (
                            <button className="clear-filters-btn" onClick={clearAllFilters}>
                                مسح جميع الفلاتر
                            </button>
                        )}
                    </div>
                </div>

                <div className="category-chips-wrapper">
                    <div className="category-chips-header">
                        <strong>الفئات</strong>
                        {categoriesStatus === 'loading' && <span className="category-status">جاري تحميل الفئات...</span>}
                        {categoriesStatus === 'failed' && <span className="category-status text-danger">{categoriesError || 'تعذر تحميل الفئات'}</span>}
                    </div>
                    <div className="category-chips">
                        <button
                            className={`category-chip ${!filters.category ? 'active' : ''}`}
                            onClick={() => updateFiltersInUrl({ category: '' })}
                        >
                            الكل ({products.length}{hasMore ? '+' : ''})
                        </button>

                        {categories.map((category) => {
                            const countFromDoc = filters.inStock
                                ? Number(category.inStockCount)
                                : Number(category.productCount);
                            const count = Number.isFinite(countFromDoc)
                                ? countFromDoc
                                : (categoryCounts[category.id] || 0);

                            return (
                                <button
                                    key={category.id}
                                    className={`category-chip ${filters.category === category.id ? 'active' : ''}`}
                                    onClick={() => updateFiltersInUrl({ category: category.id })}
                                >
                                    {category.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="products-section">
                <div className="products-header">
                    <p className="products-count">
                        عرض <strong>{products.length}</strong> منتج
                        {filters.search ? ` لـ "${filters.search}"` : ''}
                    </p>
                    {queryMode === 'fallback' && (
                        <span className="query-mode-badge">
                            تم استخدام بحث موسع لضمان دقة الفلاتر
                        </span>
                    )}
                </div>

                {status === 'loading' && (
                    <div className="store-loading">
                        <div className="store-spinner"></div>
                        <p className="store-loading-text">جاري تحميل المنتجات...</p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="store-empty">
                        <h3>تعذر تحميل المنتجات</h3>
                        <p>{error || 'حدث خطأ غير متوقع'}</p>
                        <button className="filter-btn active" onClick={() => fetchProducts({ append: false })}>
                            إعادة المحاولة
                        </button>
                    </div>
                )}

                {status === 'succeeded' && products.length === 0 && (
                    <div className="store-empty">
                        <MdLocalMall className="store-empty-icon" />
                        <h3>لا توجد منتجات</h3>
                        <p>جرّب تغيير الفلاتر أو إعادة البحث.</p>
                    </div>
                )}

                {status === 'succeeded' && products.length > 0 && (
                    <>
                        <div className="products-grid">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    currency={currency}
                                    onOpenDetails={() => handleProductOpen(product)}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="load-more-wrap">
                                <button
                                    className="load-more-btn"
                                    onClick={handleLoadMore}
                                    disabled={loadMoreStatus === 'loading'}
                                >
                                    {loadMoreStatus === 'loading' ? 'جاري التحميل...' : 'تحميل المزيد'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <div className="whatsapp-cta">
                <button
                    className="whatsapp-btn"
                    onClick={handleWhatsAppClick}
                    title="تواصل معنا عبر واتساب"
                >
                    <FaWhatsapp />
                </button>
            </div>

            <ProductDetailsModal
                key={selectedProduct?.id || 'product-modal'}
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />

            <CartDrawer />
        </div>
    );
};

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

    const rolesDisplay = roles.length ? roles.map((role) => getRoleLabel(role)).join(' | ') : 'مستخدم';
    const managementPath = canViewAllPages ? '/dashboard' : (canViewStore ? '/admin/store' : null);
    const managementLabel = canViewAllPages ? 'لوحة التحكم' : 'لوحة المبيعات';

    return (
        <header className="store-header">
            <div className="store-header-nav">
                {user ? (
                    <>
                        {managementPath ? (
                            <Link to={managementPath} className="store-login-btn">
                                <MdDashboard /> {managementLabel}
                            </Link>
                        ) : null}
                        <span className="store-role-badge">
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

            <div className="store-header-content">
                <GiLion style={{ fontSize: '4rem', color: '#D4AF37', marginBottom: '0.5rem' }} />
                <h1 className="store-title">متجر مجموعة مجمـوعة الأسـد</h1>
                <p className="store-subtitle">أفخم الشنط والمحافظ بأسعار منافسة</p>
            </div>
        </header>
    );
};

const ProductCard = ({ product, currency, onOpenDetails }) => {
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cart.items);
    const [justAdded, setJustAdded] = useState(false);

    const productHasVariants = hasColorVariants(product);
    const nonVariantCartKey = buildCartKey(product.id);
    const nonVariantItem = cartItems.find((item) => item.cartKey === nonVariantCartKey);
    const variantItems = cartItems.filter((item) => item.productId === product.id && item.selectedColor);
    const variantQuantity = variantItems.reduce((sum, item) => sum + item.quantity, 0);
    const quantity = nonVariantItem ? nonVariantItem.quantity : 0;

    const handleQuickAdd = (event) => {
        event.stopPropagation();
        if (productHasVariants) {
            onOpenDetails();
            return;
        }
        dispatch(addToCart({ product, quantity: 1 }));
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 1500);
    };

    const handleIncrease = (event) => {
        event.stopPropagation();
        dispatch(updateQuantity({ cartKey: nonVariantCartKey, quantity: quantity + 1 }));
    };

    const handleDecrease = (event) => {
        event.stopPropagation();
        if (quantity > 1) {
            dispatch(updateQuantity({ cartKey: nonVariantCartKey, quantity: quantity - 1 }));
        } else {
            dispatch(removeFromCart(nonVariantCartKey));
        }
    };

    return (
        <article
            className={`product-card ${!product.inStock ? 'out-of-stock' : ''}`}
            onClick={onOpenDetails}
        >
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

                {product.inStock && (
                    <button
                        className={`quick-add-btn ${justAdded ? 'added' : ''}`}
                        onClick={handleQuickAdd}
                        title={productHasVariants ? 'اختر اللون' : 'أضف للسلة'}
                    >
                        {productHasVariants ? <MdColorLens /> : (justAdded ? <MdCheck /> : <MdAdd />)}
                    </button>
                )}
            </div>

            <div className="product-card-content">
                <h3 className="product-card-name">{product.name}</h3>
                {product.categoryName && <p className="product-card-category">{product.categoryName}</p>}
                {product.description && (
                    <p className="product-card-description">{product.description}</p>
                )}

                {productHasVariants && (
                    <p className="product-card-variant-note">
                        <MdColorLens /> متوفر بعدة ألوان
                        {variantQuantity > 0 ? ` - في السلة ${variantQuantity} قطعة` : ''}
                    </p>
                )}

                <div className="product-card-footer">
                    <span className="product-card-price">
                        {formatCurrency(fromCents(product.price), currency)}
                    </span>

                    {product.inStock ? (
                        productHasVariants ? (
                            <button
                                className="product-card-action add-to-cart"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onOpenDetails();
                                }}
                            >
                                <MdColorLens />
                                اختر اللون
                            </button>
                        ) : quantity > 0 ? (
                            <div className="product-card-qty-control" onClick={(event) => event.stopPropagation()}>
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
