import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/productsSlice';
import { fetchCustomers } from '../store/customersSlice';
import { createStockOut, fetchTransactions } from '../store/transactionsSlice';
import { userService } from '../services/userService';
import { isValidQuantity, isValidPrice, ValidationMessages } from '../utils/validation';
import { formatCurrency } from '../utils/currency';
import { MdArrowUpward, MdAdd, MdDelete, MdCheck, MdError, MdWarning } from 'react-icons/md';
import './StockOutPage.css';
import './StockInPage.css'; // Reuse shared styles

const StockOutPage = () => {
    const dispatch = useDispatch();
    const { products } = useSelector((state) => state.products);
    const { customers } = useSelector((state) => state.customers);
    const { status: txStatus, error: txError } = useSelector((state) => state.transactions);
    const { userProfile } = useSelector((state) => state.auth);
    const { currency } = useSelector((state) => state.company);

    const [customerId, setCustomerId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [validationError, setValidationError] = useState('');

    const canCreateTransaction = userService.canPerformAction(userProfile?.role, 'CREATE_TRANSACTION');

    useEffect(() => {
        dispatch(fetchProducts());
        dispatch(fetchCustomers());
    }, [dispatch]);

    // Get selected customer name
    const selectedCustomer = customers.find(c => c.id === customerId);

    // Get selected product
    const currentProduct = products.find(p => p.id === selectedProduct);

    const handleAddToCart = () => {
        setValidationError('');
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        if (!isValidQuantity(quantity)) {
            setValidationError(ValidationMessages.INVALID_QUANTITY);
            return;
        }

        if (!isValidPrice(sellingPrice)) {
            setValidationError(ValidationMessages.INVALID_PRICE);
            return;
        }

        if (!quantity || !sellingPrice) return;

        // Check if we have enough stock
        const requestedQty = parseInt(quantity);
        const cartQty = cart.find(item => item.productId === selectedProduct)?.quantity || 0;
        const totalNeeded = requestedQty + cartQty;

        if (totalNeeded > product.quantity) {
            setValidationError(`الكمية المطلوبة (${totalNeeded}) أكبر من المتوفر (${product.quantity})`);
            return;
        }

        const existingIndex = cart.findIndex(item => item.productId === selectedProduct);
        if (existingIndex >= 0) {
            // Update existing item
            const newCart = [...cart];
            newCart[existingIndex] = {
                ...newCart[existingIndex],
                quantity: newCart[existingIndex].quantity + requestedQty,
                sellingPrice: parseFloat(sellingPrice)
            };
            setCart(newCart);
        } else {
            // Add new item
            setCart([...cart, {
                productId: product.id,
                productName: product.name,
                quantity: requestedQty,
                costPrice: product.costPrice || 0,
                sellingPrice: parseFloat(sellingPrice)
            }]);
        }

        // Reset fields
        setSelectedProduct('');
        setQuantity('');
        setSellingPrice('');
    };

    const handleRemoveFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerId || cart.length === 0 || !canCreateTransaction) return;

        setSuccessMessage('');

        const result = await dispatch(createStockOut({
            customerId,
            customerName: selectedCustomer?.name || '',
            items: cart,
            notes
        }));

        if (!result.error) {
            setSuccessMessage('تم تسجيل خروج البضاعة بنجاح!');
            setCart([]);
            setNotes('');
            setCustomerId('');
            // Refresh products to show updated quantities
            dispatch(fetchProducts());
            dispatch(fetchTransactions());
        }
    };

    // Calculate totals
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalSales = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    const totalProfit = totalSales - totalCost;

    // Active customers only
    const activeCustomers = customers.filter(c => c.isActive !== false);

    return (
        <div className="stock-out-page">
            <h1><MdArrowUpward /> إخراج بضاعة (Stock OUT)</h1>

            {!canCreateTransaction && (
                <div className="view-only-alert">
                    <MdError /> لديك صلاحية العرض فقط. لا يمكنك تسجيل إخراج بضاعة.
                </div>
            )}

            {successMessage && (
                <div className="success-message">
                    <MdCheck /> {successMessage}
                </div>
            )}

            {txError && (
                <div className="error-message">
                    <MdError /> {txError}
                </div>
            )}

            <div className="stock-out-layout">
                {/* Form */}
                <div className="stock-form-card">
                    <h3>إخراج منتجات للفرع</h3>

                    <div className="form-group">
                        <label>الفرع (العميل) *</label>
                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            required
                            disabled={!canCreateTransaction}
                        >
                            <option value="">اختر الفرع...</option>
                            {activeCustomers.map(customer => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {validationError && (
                        <div className="validation-error-msg" style={{ color: 'red', marginBottom: '10px' }}>
                            <MdError /> {validationError}
                        </div>
                    )}

                    <div className="product-row">
                        <div className="form-group">
                            <label>المنتج</label>
                            <select
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    const product = products.find(p => p.id === e.target.value);
                                    if (product) {
                                        setSellingPrice(product.price || '');
                                    }
                                }}
                                disabled={!canCreateTransaction}
                            >
                                <option value="">اختر منتج...</option>
                                {products.map(product => (
                                    <option
                                        key={product.id}
                                        value={product.id}
                                        disabled={product.quantity === 0}
                                    >
                                        {product.name}
                                        {product.quantity === 0 ? ' (نفذ)' : ` (متوفر: ${product.quantity})`}
                                    </option>
                                ))}
                            </select>
                            {currentProduct && currentProduct.quantity < 10 && currentProduct.quantity > 0 && (
                                <div className="stock-warning">
                                    <MdWarning /> المخزون منخفض! ({currentProduct.quantity} فقط)
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>الكمية</label>
                            <input
                                type="number"
                                min="1"
                                max={currentProduct?.quantity || 999}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                disabled={!canCreateTransaction}
                            />
                        </div>

                        <div className="form-group">
                            <label>سعر البيع</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                placeholder="0.00"
                                disabled={!canCreateTransaction}
                            />
                        </div>

                        <button
                            type="button"
                            className="add-product-btn"
                            onClick={handleAddToCart}
                            disabled={!selectedProduct || !quantity || !sellingPrice || !canCreateTransaction}
                        >
                            <MdAdd />
                        </button>
                    </div>

                    <div className="notes-area form-group">
                        <label>ملاحظات</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="أي ملاحظات على هذه الشحنة..."
                            rows={3}
                            disabled={!canCreateTransaction}
                        />
                    </div>
                </div>

                {/* Cart */}
                <div className="cart-card">
                    <h3>
                        سلة الإخراج
                        <span className="cart-badge">{cart.length} منتج</span>
                    </h3>

                    {cart.length === 0 ? (
                        <p className="cart-empty">اختر منتجات لإخراجها للفرع</p>
                    ) : (
                        <>
                            <ul className="cart-items">
                                {cart.map(item => (
                                    <li key={item.productId} className="cart-item">
                                        <div className="cart-item-info">
                                            <span className="cart-item-name">{item.productName}</span>
                                            <span className="cart-item-details">
                                                {item.quantity} × {formatCurrency(item.sellingPrice, currency)}
                                            </span>
                                        </div>
                                        <span className="cart-item-total">
                                            {formatCurrency(item.quantity * item.sellingPrice, currency)}
                                        </span>
                                        {canCreateTransaction && (
                                            <button
                                                className="remove-item-btn"
                                                onClick={() => handleRemoveFromCart(item.productId)}
                                            >
                                                <MdDelete />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <div className="cart-summary">
                                <div className="summary-row">
                                    <span>إجمالي الكمية:</span>
                                    <span>{totalQuantity} وحدة</span>
                                </div>
                                <div className="summary-row">
                                    <span>قيمة البيع:</span>
                                    <span>{formatCurrency(totalSales, currency)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>التكلفة:</span>
                                    <span>{formatCurrency(totalCost, currency)}</span>
                                </div>
                                <div className={`summary-row profit-row ${totalProfit < 0 ? 'negative' : ''}`}>
                                    <span>الربح المتوقع:</span>
                                    <span>{formatCurrency(totalProfit, currency)}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>الإجمالي:</span>
                                    <span>{formatCurrency(totalSales, currency)}</span>
                                </div>
                            </div>

                            {canCreateTransaction && (
                                <button
                                    className="submit-btn"
                                    onClick={handleSubmit}
                                    disabled={!customerId || cart.length === 0 || txStatus === 'loading'}
                                >
                                    {txStatus === 'loading' ? 'جاري التسجيل...' : 'تأكيد إخراج البضاعة'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockOutPage;
