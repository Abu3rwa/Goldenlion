import React, { useEffect, useMemo, useState } from 'react';
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
    , MdChevronLeft
    , MdChevronRight
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
    const { products, status, error } = useSelector((state) => state.publicProducts);
    const { currency, phone } = useSelector((state) => state.company);

    // Fetch products on mount
    useEffect(() => {
        dispatch(fetchPublicProducts());
    }, [dispatch]);

    const inStockProducts = useMemo(() => {
        return products.filter((product) => product?.inStock !== false);
    }, [products]);

    const featuredInStockProducts = useMemo(() => {
        return inStockProducts.filter((product) => Boolean(product?.featured));
    }, [inStockProducts]);

    const featuredProducts = useMemo(() => {
        return products.filter((product) => Boolean(product?.featured));
    }, [products]);

    const showcaseMeta = useMemo(() => {
        if (featuredInStockProducts.length > 0) {
            return {
                title: 'منتجات مميزة',
                subtitle: 'اكتشف أحدث المنتجات المميزة لدينا',
                items: featuredInStockProducts.slice(0, 6),
            };
        }

        if (featuredProducts.length > 0) {
            return {
                title: 'منتجات مميزة',
                subtitle: 'تصفح المنتجات المميزة لدينا',
                items: featuredProducts.slice(0, 6),
            };
        }

        if (inStockProducts.length > 0) {
            return {
                title: 'منتجاتنا',
                subtitle: 'تصفح أحدث المنتجات المتوفرة لدينا',
                items: inStockProducts.slice(0, 6),
            };
        }

        return {
            title: 'منتجاتنا',
            subtitle: 'تصفح أحدث منتجاتنا',
            items: products.slice(0, 6),
        };
    }, [featuredInStockProducts, featuredProducts, inStockProducts, products]);

    const [heroSlideIndex, setHeroSlideIndex] = useState(0);

    useEffect(() => {
        setHeroSlideIndex(0);
    }, [showcaseMeta.items.length]);

    useEffect(() => {
        if (showcaseMeta.items.length <= 1) return undefined;

        const timerId = window.setInterval(() => {
            setHeroSlideIndex((prev) => (prev + 1) % showcaseMeta.items.length);
        }, 4500);

        return () => window.clearInterval(timerId);
    }, [showcaseMeta.items.length]);

    const activeHeroProduct = showcaseMeta.items[heroSlideIndex] || null;

    const handleHeroSlideNext = () => {
        if (showcaseMeta.items.length <= 1) return;
        setHeroSlideIndex((prev) => (prev + 1) % showcaseMeta.items.length);
    };

    const handleHeroSlidePrev = () => {
        if (showcaseMeta.items.length <= 1) return;
        setHeroSlideIndex((prev) => (prev - 1 + showcaseMeta.items.length) % showcaseMeta.items.length);
    };

    // If logged in, redirect to appropriate dashboard
    if (user) {
        return <RoleBasedRedirect />;
    }

    const handleWhatsAppClick = () => {
        const phoneNumber = phone || '218931169753';
        const message = encodeURIComponent('مرحباً، أرغب بالاستفسار عن المنتجات');
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    const buildProductStoreLink = (productId) => {
        if (!productId) return '/store';
        return `/store#product-${encodeURIComponent(`${productId}`)}`;
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-layout">
                    <div className="hero-slider-panel">
                        

                        {(status === 'idle' || status === 'loading') && (
                            <p className="hero-slider-state">جاري تحميل المنتجات...</p>
                        )}

                        {status === 'failed' && (
                            <p className="hero-slider-state hero-slider-state-error">
                                تعذر تحميل المنتجات. {error ? `(${error})` : ''}
                            </p>
                        )}

                        {status === 'succeeded' && !activeHeroProduct && (
                            <p className="hero-slider-state">لا توجد منتجات متاحة حالياً.</p>
                        )}

                        {activeHeroProduct && (
                            <div className="hero-slider-card-wrap">
                                <button
                                    className="hero-slider-nav prev"
                                    type="button"
                                    onClick={handleHeroSlidePrev}
                                    aria-label="السابق"
                                >
                                    <MdChevronRight />
                                </button>

                                <Link to={buildProductStoreLink(activeHeroProduct.id)} className="hero-slider-card">
                                    <div className="hero-slider-image-wrap">
                                        {activeHeroProduct.images?.[0] ? (
                                            <img
                                                src={activeHeroProduct.images[0]}
                                                alt={activeHeroProduct.name}
                                                className="hero-slider-image"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="hero-slider-image-placeholder">
                                                <MdImage />
                                            </div>
                                        )}
                                    </div>
                                    <div className="hero-slider-info">
                                        <h3>{activeHeroProduct.name}</h3>
                                        <p>{formatCurrency(fromCents(activeHeroProduct.price), currency)}</p>
                                    </div>
                                </Link>

                                <button
                                    className="hero-slider-nav next"
                                    type="button"
                                    onClick={handleHeroSlideNext}
                                    aria-label="التالي"
                                >
                                    <MdChevronLeft />
                                </button>
                            </div>
                        )}

                        {showcaseMeta.items.length > 1 && (
                            <div className="hero-slider-dots">
                                {showcaseMeta.items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`hero-slider-dot ${index === heroSlideIndex ? 'active' : ''}`}
                                        onClick={() => setHeroSlideIndex(index)}
                                        aria-label={`عرض المنتج ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hero-content">
                        <div className="hero-logo">
                            <GiLion className="lion-icon" />
                        </div>
                        <h1 className="hero-title">مجمـوعة الأسـد</h1>
                        <p className="hero-subtitle">أفضل الشنط والمحافظ بأسعار منافسة</p>
                        <div className="hero-actions">
                            <Link to="/store" className="btn-primary-gold">
                                <MdShoppingCart /> تسوق الآن
                            </Link>
                            <Link to="/checkout" className="btn-outline-gold">
                                <MdPayment /> إتمام الطلب
                            </Link>
                            <Link to="/login" className="btn-outline-gold">
                                <MdLogin /> تسجيل الدخول
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="hero-decoration"></div>
            </section>

            {/* Products Showcase Section */}
            <section className="featured-products-section">
                <div className="featured-products-header">
                    <h2><MdStar className="text-gold" /> {showcaseMeta.title}</h2>
                    <p>{showcaseMeta.subtitle}</p>
                </div>

                {(status === 'idle' || status === 'loading') && (
                    <p className="featured-products-state">جاري تحميل المنتجات...</p>
                )}

                {status === 'failed' && (
                    <p className="featured-products-state featured-products-state-error">
                        تعذر تحميل المنتجات حالياً. {error ? `(${error})` : 'يرجى المحاولة لاحقاً.'}
                    </p>
                )}

                {status === 'succeeded' && showcaseMeta.items.length === 0 && (
                    <p className="featured-products-state">
                        لا توجد منتجات متاحة حالياً.
                    </p>
                )}

                {status === 'succeeded' && showcaseMeta.items.length > 0 && (
                    <div className="featured-products-grid">
                        {showcaseMeta.items.map((product) => (
                            <FeaturedProductCard
                                key={product.id}
                                product={product}
                                currency={currency}
                                productLink={buildProductStoreLink(product.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="featured-products-cta">
                    <Link to="/store" className="btn-view-all">
                        عرض جميع المنتجات <MdArrowBack />
                    </Link>
                </div>
            </section>

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

        </div>
    );
};

/**
 * Featured Product Card Component
 */
const FeaturedProductCard = ({ product, currency, productLink }) => {
    return (
        <Link to={productLink || '/store'} className="featured-product-card">
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
                {Boolean(product?.featured) && (
                    <span className="featured-product-badge">
                        <MdStar /> مميز
                    </span>
                )}
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
