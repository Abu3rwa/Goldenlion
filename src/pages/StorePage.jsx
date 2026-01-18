import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublicProducts } from '../store/publicProductsSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import { GiLion } from 'react-icons/gi';
import {
    MdSearch,
    MdStar,
    MdShoppingCart,
    MdImage,
    MdLocalMall,
    MdFilterList,
    MdWhatsapp
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import './StorePage.css';

/**
 * Public Store Page - Displays all available products for visitors
 * Features: Search, Filter by featured, Responsive grid, WhatsApp contact
 */
const StorePage = () => {
    const dispatch = useDispatch();
    const { products, status } = useSelector((state) => state.publicProducts);
    const { currency, phone } = useSelector((state) => state.company);

    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'featured'

    useEffect(() => {
        dispatch(fetchPublicProducts());
    }, [dispatch]);

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

    // Featured products for hero section
    const featuredProducts = useMemo(() => {
        return products.filter(p => p.inStock && p.featured).slice(0, 4);
    }, [products]);

    const handleWhatsAppClick = () => {
        const phoneNumber = phone || '218910000000'; // Default phone
        const message = encodeURIComponent('مرحباً، أرغب بالاستفسار عن المنتجات');
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    // Loading state
    if (status === 'loading') {
        return (
            <div className="store-page">
                <StoreHeader />
                <div className="store-loading">
                    <div className="store-spinner"></div>
                    <p className="store-loading-text">جاري تحميل المنتجات...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="store-page">
            {/* Header */}
            <StoreHeader />

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
                                onWhatsAppClick={handleWhatsAppClick}
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
        </div>
    );
};

/**
 * Store Header Component
 */
const StoreHeader = () => (
    <header className="store-header">
        <div className="store-header-content">
            <Link to="/" style={{ textDecoration: 'none' }}>
                <GiLion style={{ fontSize: '3rem', color: '#D4AF37', marginBottom: '0.5rem' }} />
            </Link>
            <h1 className="store-title">متجر الأسد الذهبي</h1>
            <p className="store-subtitle">أفخم الشنط والمحافظ بأسعار منافسة</p>
        </div>
    </header>
);

/**
 * Product Card Component
 */
const ProductCard = ({ product, currency, onWhatsAppClick }) => {
    const handleOrderClick = () => {
        const phone = '218910000000'; // You can make this dynamic
        const message = encodeURIComponent(`مرحباً، أرغب بطلب المنتج: ${product.name}`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    return (
        <article className={`product-card ${!product.inStock ? 'out-of-stock' : ''}`}>
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
                        <button
                            className="product-card-action add-to-cart"
                            onClick={handleOrderClick}
                        >
                            <FaWhatsapp /> أطلب الآن
                        </button>
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
