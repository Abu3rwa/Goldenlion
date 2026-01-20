import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import {
    MdClose,
    MdAdd,
    MdRemove,
    MdShoppingCart,
    MdStar,
    MdImage,
    MdChevronLeft,
    MdChevronRight,
    MdCheck,
    MdColorLens
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import './ProductDetailsModal.css';

/**
 * Product Details Modal
 * Shows full product info with image gallery and add to cart functionality
 */
const ProductDetailsModal = ({ product, isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { currency, phone } = useSelector((state) => state.company);
    const cartItems = useSelector((state) => state.cart.items);

    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [addedToCart, setAddedToCart] = useState(false);
    const [selectedColor, setSelectedColor] = useState(null);

    // Early return if modal is not open or product is null
    if (!isOpen || !product) return null;

    // Check if product has color variants
    const hasColorVariants = product.colorVariants && product.colorVariants.length > 0;
    const availableColors = hasColorVariants
        ? product.colorVariants.filter(v => v.quantity > 0)
        : [];

    const images = product.images?.length > 0 ? product.images : [];

    // Check if this product+color combo is in cart
    const cartKey = selectedColor
        ? `${product.id}_${selectedColor.color}`
        : product.id;
    const isInCart = cartItems.some(item => item.cartKey === cartKey);

    const handleAddToCart = () => {
        // If product has color variants and none selected, don't add
        if (hasColorVariants && !selectedColor) {
            return;
        }

        dispatch(addToCart({ product, quantity, selectedColor }));
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleQuantityChange = (delta) => {
        setQuantity(prev => Math.max(1, prev + delta));
    };

    const handleNextImage = () => {
        if (images.length > 1) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
    };

    const handlePrevImage = () => {
        if (images.length > 1) {
            setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        }
    };

    const handleWhatsAppOrder = () => {
        const phoneNumber = phone || '218910000000';
        const message = encodeURIComponent(
            `مرحباً، أرغب بطلب المنتج:\n${product.name}\nالكمية: ${quantity}\nالسعر: ${formatCurrency(fromCents(product.price * quantity), currency)}`
        );
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="product-modal-overlay" onClick={handleOverlayClick}>
            <div className="product-modal">
                {/* Close Button */}
                <button className="modal-close-btn" onClick={onClose}>
                    <MdClose />
                </button>

                <div className="modal-content">
                    {/* Image Gallery */}
                    <div className="modal-gallery">
                        <div className="gallery-main">
                            {images.length > 0 ? (
                                <img
                                    src={images[currentImageIndex]}
                                    alt={product.name}
                                    className="gallery-image"
                                />
                            ) : (
                                <div className="gallery-placeholder">
                                    <MdImage />
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button className="gallery-nav prev" onClick={handlePrevImage}>
                                        <MdChevronRight />
                                    </button>
                                    <button className="gallery-nav next" onClick={handleNextImage}>
                                        <MdChevronLeft />
                                    </button>
                                </>
                            )}

                            {/* Badges */}
                            <div className="gallery-badges">
                                {product.featured && (
                                    <span className="gallery-badge featured">
                                        <MdStar /> مميز
                                    </span>
                                )}
                                {!product.inStock && (
                                    <span className="gallery-badge out-of-stock">
                                        غير متوفر
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="gallery-thumbnails">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        className={`thumbnail ${idx === currentImageIndex ? 'active' : ''}`}
                                        onClick={() => setCurrentImageIndex(idx)}
                                    >
                                        <img src={img} alt={`${product.name} ${idx + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Image Counter */}
                        {images.length > 1 && (
                            <div className="gallery-counter">
                                {currentImageIndex + 1} / {images.length}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="modal-info">
                        <h2 className="modal-product-name">{product.name}</h2>

                        {product.nameEn && (
                            <p className="modal-product-name-en">{product.nameEn}</p>
                        )}

                        <div className="modal-price">
                            {formatCurrency(fromCents(product.price), currency)}
                        </div>

                        {product.description && (
                            <div className="modal-description">
                                <h4>الوصف</h4>
                                <p>{product.description}</p>
                            </div>
                        )}

                        {/* Color Variants Selector */}
                        {hasColorVariants && (
                            <div className="modal-color-variants">
                                <h4>
                                    <MdColorLens className="me-1" />
                                    اختر اللون
                                </h4>
                                <div className="color-options">
                                    {product.colorVariants.map((variant, idx) => (
                                        <button
                                            key={idx}
                                            className={`color-option ${selectedColor?.color === variant.color ? 'selected' : ''} ${variant.quantity <= 0 ? 'out-of-stock' : ''}`}
                                            onClick={() => variant.quantity > 0 && setSelectedColor(variant)}
                                            disabled={variant.quantity <= 0}
                                            title={`${variant.color} (${variant.quantity > 0 ? `متوفر: ${variant.quantity}` : 'غير متوفر'})`}
                                        >
                                            <span
                                                className="color-circle"
                                                style={{ backgroundColor: variant.colorCode }}
                                            />
                                            <span className="color-name">{variant.color}</span>
                                            {variant.quantity <= 0 && <span className="out-label">نفد</span>}
                                            {selectedColor?.color === variant.color && (
                                                <MdCheck className="check-icon" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {hasColorVariants && !selectedColor && (
                                    <p className="color-hint">يرجى اختيار اللون</p>
                                )}
                            </div>
                        )}

                        {/* Quantity Selector */}
                        {product.inStock && (
                            <div className="modal-quantity">
                                <span className="quantity-label">الكمية:</span>
                                <div className="quantity-controls">
                                    <button
                                        className="quantity-btn"
                                        onClick={() => handleQuantityChange(-1)}
                                        disabled={quantity <= 1}
                                    >
                                        <MdRemove />
                                    </button>
                                    <span className="quantity-value">{quantity}</span>
                                    <button
                                        className="quantity-btn"
                                        onClick={() => handleQuantityChange(1)}
                                    >
                                        <MdAdd />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        {product.inStock && quantity > 1 && (
                            <div className="modal-total">
                                الإجمالي: <strong>{formatCurrency(fromCents(product.price * quantity), currency)}</strong>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="modal-actions">
                            {product.inStock ? (
                                <>
                                    <button
                                        className={`btn-add-cart ${addedToCart ? 'added' : ''} ${isInCart && !addedToCart ? 'in-cart' : ''}`}
                                        onClick={handleAddToCart}
                                        disabled={hasColorVariants && !selectedColor}
                                    >
                                        {addedToCart ? (
                                            <>
                                                <MdCheck /> تمت الإضافة
                                            </>
                                        ) : isInCart ? (
                                            <>
                                                <MdShoppingCart /> إضافة المزيد
                                            </>
                                        ) : (
                                            <>
                                                <MdShoppingCart /> أضف للسلة
                                            </>
                                        )}
                                    </button>
                                    <button
                                        className="btn-whatsapp-order"
                                        onClick={handleWhatsAppOrder}
                                    >
                                        <FaWhatsapp /> أطلب عبر واتساب
                                    </button>
                                </>
                            ) : (
                                <div className="out-of-stock-message">
                                    <MdImage />
                                    <span>هذا المنتج غير متوفر حالياً</span>
                                </div>
                            )}
                        </div>

                        {/* Stock Status */}
                        <div className={`modal-stock-status ${product.inStock ? 'in-stock' : 'out'}`}>
                            {product.inStock ? '✓ متوفر في المخزون' : '✗ غير متوفر'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsModal;
