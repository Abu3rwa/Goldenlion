import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    selectCartItems,
    selectCartItemCount,
    selectCartSubtotal,
    selectIsCartOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    setCartOpen
} from '../store/cartSlice';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import {
    MdClose,
    MdDelete,
    MdAdd,
    MdRemove,
    MdShoppingCart,
    MdDeleteSweep,
    MdImage,
    MdArrowBack
} from 'react-icons/md';

import './CartDrawer.css';

/**
 * Cart Drawer - Slide-in cart panel
 * Shows cart items with quantity controls and checkout options
 */
const CartDrawer = () => {
    const dispatch = useDispatch();
    const cartItems = useSelector(selectCartItems);
    const itemCount = useSelector(selectCartItemCount);
    const subtotal = useSelector(selectCartSubtotal);
    const isOpen = useSelector(selectIsCartOpen);
    const { currency, phone } = useSelector((state) => state.company);

    const handleClose = () => {
        dispatch(setCartOpen(false));
    };

    const handleRemoveItem = (cartKey) => {
        dispatch(removeFromCart(cartKey));
    };

    const handleUpdateQuantity = (cartKey, quantity) => {
        dispatch(updateQuantity({ cartKey, quantity }));
    };

    const handleClearCart = () => {
        if (window.confirm('هل تريد إفراغ السلة بالكامل؟')) {
            dispatch(clearCart());
        }
    };



    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`cart-overlay ${isOpen ? 'open' : ''}`}
                onClick={handleOverlayClick}
            />

            {/* Drawer */}
            <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="cart-header">
                    <div className="cart-title">
                        <MdShoppingCart />
                        <h3>سلة التسوق</h3>
                        {itemCount > 0 && (
                            <span className="cart-count-badge">{itemCount}</span>
                        )}
                    </div>
                    <button className="cart-close-btn" onClick={handleClose}>
                        <MdClose />
                    </button>
                </div>

                {/* Content */}
                <div className="cart-content">
                    {cartItems.length === 0 ? (
                        <div className="cart-empty">
                            <MdShoppingCart className="cart-empty-icon" />
                            <h4>السلة فارغة</h4>
                            <p>لم تقم بإضافة أي منتجات بعد</p>
                            <Link to="/store" className="btn-continue-shopping" onClick={handleClose}>
                                <MdArrowBack /> تصفح المنتجات
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Clear All Button */}
                            <div className="cart-actions-top">
                                <button className="btn-clear-cart" onClick={handleClearCart}>
                                    <MdDeleteSweep /> إفراغ السلة
                                </button>
                            </div>

                            {/* Cart Items */}
                            <div className="cart-items">
                                {cartItems.map((item) => (
                                    <div key={item.cartKey || item.productId} className="cart-item">
                                        <div className="cart-item-image">
                                            {item.image ? (
                                                <img src={item.image} alt={item.productName} />
                                            ) : (
                                                <div className="cart-item-placeholder">
                                                    <MdImage />
                                                </div>
                                            )}
                                        </div>
                                        <div className="cart-item-info">
                                            <h5 className="cart-item-name">{item.productName}</h5>
                                            {item.selectedColor && (
                                                <div className="cart-item-color">
                                                    <span
                                                        className="color-dot"
                                                        style={{ backgroundColor: item.selectedColor.colorCode }}
                                                    />
                                                    <span>{item.selectedColor.color}</span>
                                                </div>
                                            )}
                                            <span className="cart-item-price">
                                                {formatCurrency(fromCents(item.price), currency)}
                                            </span>
                                        </div>
                                        <div className="cart-item-controls">
                                            <div className="quantity-controls">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.cartKey || item.productId, item.quantity - 1)}
                                                    className="qty-btn"
                                                >
                                                    <MdRemove />
                                                </button>
                                                <span className="qty-value">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.cartKey || item.productId, item.quantity + 1)}
                                                    className="qty-btn"
                                                >
                                                    <MdAdd />
                                                </button>
                                            </div>
                                            <span className="cart-item-total">
                                                {formatCurrency(fromCents(item.price * item.quantity), currency)}
                                            </span>
                                            <button
                                                className="cart-item-remove"
                                                onClick={() => handleRemoveItem(item.cartKey || item.productId)}
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer - Only show when cart has items */}
                {cartItems.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-subtotal">
                            <span>المجموع الفرعي:</span>
                            <strong>{formatCurrency(fromCents(subtotal), currency)}</strong>
                        </div>
                        <p className="cart-delivery-note">
                            * لا يشمل رسوم التوصيل
                        </p>
                        <Link to="/checkout" className="btn-checkout-action" onClick={handleClose}>
                            <MdShoppingCart /> إتمام الشراء
                        </Link>
                        <Link to="/store" className="btn-back-to-shop" onClick={handleClose}>
                            <MdArrowBack /> متابعة التسوق
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
