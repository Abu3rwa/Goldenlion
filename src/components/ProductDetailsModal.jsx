import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import {
    buildCartKey,
    getAvailableStockForSelection,
    hasColorVariants,
    normalizeSelectedColor,
} from '../utils/cartUtils';
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

    const safeProduct = product || {};

    const productHasColorVariants = hasColorVariants(safeProduct);
    const normalizedSelectedColor = normalizeSelectedColor(safeProduct, selectedColor);
    const maxQuantity = getAvailableStockForSelection(safeProduct, normalizedSelectedColor);
    const canAddToCart = safeProduct.inStock && (!productHasColorVariants || Boolean(normalizedSelectedColor)) && maxQuantity > 0;

    const images = safeProduct.images?.length > 0 ? safeProduct.images : [];

    // Check if this product+color combo is in cart
    const cartKey = buildCartKey(safeProduct.id, normalizedSelectedColor);
    const isInCart = cartItems.some(item => item.cartKey === cartKey);

    const selectedVariantStockText = (() => {
        if (!productHasColorVariants || !normalizedSelectedColor) return '';
        return `المتوفر من هذا اللون: ${maxQuantity}`;
    })();

    // Early return if modal is not open or product is null
    if (!isOpen || !product) return null;

    const boundedQuantity = Number.isFinite(maxQuantity)
        ? Math.min(quantity, Math.max(1, maxQuantity))
        : quantity;

    const handleAddToCart = () => {
        if (!canAddToCart) {
            return;
        }

        const safeQuantity = Number.isFinite(maxQuantity)
            ? Math.min(boundedQuantity, maxQuantity)
            : boundedQuantity;

        dispatch(addToCart({ product: safeProduct, quantity: safeQuantity, selectedColor: normalizedSelectedColor }));
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleQuantityChange = (delta) => {
        setQuantity((prev) => {
            const current = Number.isFinite(maxQuantity)
                ? Math.min(prev, Math.max(1, maxQuantity))
                : prev;
            const nextValue = Math.max(1, current + delta);
            if (Number.isFinite(maxQuantity)) {
                return Math.min(nextValue, Math.max(1, maxQuantity));
            }
            return nextValue;
        });
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
        const phoneNumber = phone || '218931169753';
        const primaryImage = images[0] || '';
        const productDetailsLink = safeProduct.id
            ? `${window.location.origin}/store#product-${encodeURIComponent(`${safeProduct.id}`)}`
            : '';
        const checkoutLink = `${window.location.origin}/checkout`;

        // Keep the image URL on its own line so WhatsApp can attempt link preview.
        const lines = [
            '*مرحباً، أرغب بطلب المنتج:*',
            safeProduct.name,
            `الكمية: ${boundedQuantity}`,
            `السعر: ${formatCurrency(fromCents(safeProduct.price * boundedQuantity), currency)}`,
        ];

        if (primaryImage) {
            lines.push('');
            lines.push('رابط الصورة:');
            lines.push(primaryImage);
        }

        if (productDetailsLink) {
            lines.push('');
            lines.push('رابط تفاصيل المنتج (للإدارة):');
            lines.push(productDetailsLink);
        }

        lines.push('');
        lines.push('رابط إتمام الطلب (مع/بدون توصيل):');
        lines.push(checkoutLink);

        const message = encodeURIComponent(lines.join('\n'));
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
                                    alt={safeProduct.name}
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
                                {safeProduct.featured && (
                                    <span className="gallery-badge featured">
                                        <MdStar /> مميز
                                    </span>
                                )}
                                {!safeProduct.inStock && (
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
                                        <img src={img} alt={`${safeProduct.name} ${idx + 1}`} />
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
                        <h2 className="modal-product-name">{safeProduct.name}</h2>

                        {safeProduct.nameEn && (
                            <p className="modal-product-name-en">{safeProduct.nameEn}</p>
                        )}

                        <div className="modal-price">
                            {formatCurrency(fromCents(safeProduct.price), currency)}
                        </div>

                        {safeProduct.description && (
                            <div className="modal-description">
                                <h4>الوصف</h4>
                                <p>{safeProduct.description}</p>
                            </div>
                        )}

                        {/* Color Variants Selector */}
                        {productHasColorVariants && (
                            <div className="modal-color-variants">
                                <h4>
                                    <MdColorLens className="me-1" />
                                    اختر اللون
                                </h4>
                                <div className="color-options">
                                    {safeProduct.colorVariants.map((variant, idx) => (
                                        <button
                                            key={idx}
                                            className={`color-option ${normalizedSelectedColor?.colorKey === normalizeSelectedColor(safeProduct, variant)?.colorKey ? 'selected' : ''} ${variant.quantity <= 0 ? 'out-of-stock' : ''}`}
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
                                            <span className="variant-stock-label">
                                                {variant.quantity > 0 ? `${variant.quantity} قطعة` : 'نفد'}
                                            </span>
                                            {normalizedSelectedColor?.colorKey === normalizeSelectedColor(safeProduct, variant)?.colorKey && (
                                                <MdCheck className="check-icon" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {productHasColorVariants && !normalizedSelectedColor && (
                                    <p className="color-hint">يرجى اختيار اللون</p>
                                )}
                                {selectedVariantStockText && (
                                    <p className="color-stock-hint">{selectedVariantStockText}</p>
                                )}
                            </div>
                        )}

                        {/* Quantity Selector */}
                        {safeProduct.inStock && (
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
                                    <span className="quantity-value">{boundedQuantity}</span>
                                    <button
                                        className="quantity-btn"
                                        onClick={() => handleQuantityChange(1)}
                                        disabled={Number.isFinite(maxQuantity) && boundedQuantity >= maxQuantity}
                                    >
                                        <MdAdd />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        {safeProduct.inStock && boundedQuantity > 1 && (
                            <div className="modal-total">
                                الإجمالي: <strong>{formatCurrency(fromCents(safeProduct.price * boundedQuantity), currency)}</strong>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="modal-actions">
                            {safeProduct.inStock ? (
                                <>
                                    <button
                                        className={`btn-add-cart ${addedToCart ? 'added' : ''} ${isInCart && !addedToCart ? 'in-cart' : ''}`}
                                        onClick={handleAddToCart}
                                        disabled={!canAddToCart}
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
                                                <MdShoppingCart />
                                                {!canAddToCart && productHasColorVariants ? 'اختر اللون أولاً' : 'أضف للسلة'}
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
                        <div className={`modal-stock-status ${safeProduct.inStock ? 'in-stock' : 'out'}`}>
                            {safeProduct.inStock ? '✓ متوفر في المخزون' : '✗ غير متوفر'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsModal;
