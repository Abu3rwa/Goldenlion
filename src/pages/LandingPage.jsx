import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import RoleBasedRedirect from '../components/RoleBasedRedirect';
import { fetchPublicProducts } from '../store/publicProductsSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import { GiLion } from 'react-icons/gi';
import {
    MdLogin,
    MdShoppingCart,
    MdLocalShipping,
    MdStar,
    MdImage,
    MdArrowBack,
    MdVerified,
    MdPayment
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import './LandingPage.css';

/**
 * Public landing page for visitors
 * If user is authenticated, redirects to their role-based dashboard
 * Features: Hero section, Featured Products, Features, Footer
 */
const LandingPage = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { products, status } = useSelector((state) => state.publicProducts);
    const { currency, phone } = useSelector((state) => state.company);

    // Fetch products on mount
    useEffect(() => {
        dispatch(fetchPublicProducts());
    }, [dispatch]);

    // Get featured products (max 6)
    const featuredProducts = useMemo(() => {
        return products
            .filter(p => p.inStock && p.featured)
            .slice(0, 6);
    }, [products]);

    // If logged in, redirect to appropriate dashboard
    if (user) {
        return <RoleBasedRedirect />;
    }

    const handleWhatsAppClick = () => {
        const phoneNumber = phone || '218910000000';
        const message = encodeURIComponent('مرحباً، أرغب بالاستفسار عن المنتجات');
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-logo">
                        <GiLion className="lion-icon" />
                    </div>
                    <h1 className="hero-title">الأسد الذهبي</h1>
                    <p className="hero-subtitle">أفضل الشنط والمحافظ بأسعار منافسة</p>
                    <div className="hero-actions">
                        <Link to="/store" className="btn-primary-gold">
                            <MdShoppingCart /> تسوق الآن
                        </Link>
                        <Link to="/login" className="btn-outline-gold">
                            <MdLogin /> تسجيل الدخول
                        </Link>
                    </div>
                </div>
                <div className="hero-decoration"></div>
            </section>

            {/* Featured Products Section */}
            {featuredProducts.length > 0 && (
                <section className="featured-products-section">
                    <div className="featured-products-header">
                        <h2><MdStar className="text-gold" /> منتجات مميزة</h2>
                        <p>اكتشف أحدث المنتجات المميزة لدينا</p>
                    </div>
                    <div className="featured-products-grid">
                        {featuredProducts.map((product) => (
                            <FeaturedProductCard
                                key={product.id}
                                product={product}
                                currency={currency}
                            />
                        ))}
                    </div>
                    <div className="featured-products-cta">
                        <Link to="/store" className="btn-view-all">
                            عرض جميع المنتجات <MdArrowBack />
                        </Link>
                    </div>
                </section>
            )}

            {/* Features Section */}
            <section className="features-section">
                <div className="feature-card">
                    <div className="feature-icon">
                        <MdVerified />
                    </div>
                    <h3>جودة عالية</h3>
                    <p>منتجات مختارة بعناية لضمان أفضل جودة</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">
                        <MdLocalShipping />
                    </div>
                    <h3>توصيل لكل ليبيا</h3>
                    <p>نوصل لجميع المدن الليبية بأسعار مناسبة</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">
                        <MdPayment />
                    </div>
                    <h3>دفع عند الاستلام</h3>
                    <p>ادفع نقداً عند استلام طلبك</p>
                </div>
            </section>

            {/* WhatsApp CTA Section */}
            <section className="whatsapp-section">
                <div className="whatsapp-content">
                    <FaWhatsapp className="whatsapp-icon" />
                    <div className="whatsapp-text">
                        <h3>تواصل معنا مباشرة</h3>
                        <p>للطلبات والاستفسارات عبر واتساب</p>
                    </div>
                    <button className="btn-whatsapp" onClick={handleWhatsAppClick}>
                        <FaWhatsapp /> تواصل الآن
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <GiLion className="footer-logo" />
                        <span>الأسد الذهبي</span>
                    </div>
                    <p className="footer-copyright">
                        © {new Date().getFullYear()} الأسد الذهبي - جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </div>
    );
};

/**
 * Featured Product Card Component
 */
const FeaturedProductCard = ({ product, currency }) => {
    return (
        <Link to="/store" className="featured-product-card">
            <div className="featured-product-image-wrapper">
                {product.images?.[0] ? (
                    <img
                        src={product.images[0]}
                        alt={product.name}
                        className="featured-product-image"
                        loading="lazy"
                    />
                ) : (
                    <div className="featured-product-placeholder">
                        <MdImage />
                    </div>
                )}
                <span className="featured-product-badge">
                    <MdStar /> مميز
                </span>
            </div>
            <div className="featured-product-info">
                <h4 className="featured-product-name">{product.name}</h4>
                <span className="featured-product-price">
                    {formatCurrency(fromCents(product.price), currency)}
                </span>
            </div>
        </Link>
    );
};

export default LandingPage;
