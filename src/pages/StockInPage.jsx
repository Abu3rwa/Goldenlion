import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/productsSlice';
import { fetchSuppliers } from '../store/suppliersSlice';
import { createStockIn, fetchTransactions } from '../store/transactionsSlice';
import { userService } from '../services/userService';
import { isValidQuantity, isValidPrice, ValidationMessages } from '../utils/validation';
import { formatCurrency } from '../utils/currency';
import { MdArrowDownward, MdAdd, MdDelete, MdCheck, MdError } from 'react-icons/md';
import './StockInPage.css';

const StockInPage = () => {
    const dispatch = useDispatch();
    const { products } = useSelector((state) => state.products);
    const { suppliers } = useSelector((state) => state.suppliers);
    const { status: txStatus, error: txError } = useSelector((state) => state.transactions);
    const { userProfile } = useSelector((state) => state.auth);
    const { currency } = useSelector((state) => state.company);

    const [supplierId, setSupplierId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [validationError, setValidationError] = useState('');

    const canCreateTransaction = userService.canPerformAction(userProfile?.role, 'CREATE_TRANSACTION');

    useEffect(() => {
        dispatch(fetchProducts());
        dispatch(fetchSuppliers());
    }, [dispatch]);

    // Get selected supplier name
    const selectedSupplier = suppliers.find(s => s.id === supplierId);

    const handleAddToCart = () => {
        setValidationError('');
        const product = products.find(p => p.id === selectedProduct);

        if (!product) return;

        if (!isValidQuantity(quantity)) {
            setValidationError(ValidationMessages.INVALID_QUANTITY);
            return;
        }

        if (!isValidPrice(costPrice)) {
            setValidationError(ValidationMessages.INVALID_PRICE);
            return;
        }

        const existingIndex = cart.findIndex(item => item.productId === selectedProduct);
        if (existingIndex >= 0) {
            // Update existing item
            const newCart = [...cart];
            newCart[existingIndex] = {
                ...newCart[existingIndex],
                quantity: newCart[existingIndex].quantity + parseInt(quantity),
                costPrice: parseFloat(costPrice)
            };
            setCart(newCart);
        } else {
            // Add new item
            setCart([...cart, {
                productId: product.id,
                productName: product.name,
                quantity: parseInt(quantity),
                costPrice: parseFloat(costPrice),
                sellingPrice: product.price || 0
            }]);
        }

        // Reset fields
        setSelectedProduct('');
        setQuantity('');
        setCostPrice('');
    };

    const handleRemoveFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!supplierId || cart.length === 0 || !canCreateTransaction) return;

        setSuccessMessage('');

        const result = await dispatch(createStockIn({
            supplierId,
            supplierName: selectedSupplier?.name || '',
            items: cart,
            notes
        }));

        if (!result.error) {
            setSuccessMessage('تم تسجيل استلام البضاعة بنجاح!');
            setCart([]);
            setNotes('');
            setSupplierId('');
            // Refresh products to show updated quantities
            dispatch(fetchProducts());
            dispatch(fetchTransactions());
        }
    };

    // Calculate totals
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    return (
        <div className="stock-in-page">
            <h1><MdArrowDownward /> استلام بضاعة (Stock IN)</h1>

            {!canCreateTransaction && (
                <div className="view-only-alert">
                    <MdError /> لديك صلاحية العرض فقط. لا يمكنك تسجيل استلام بضاعة.
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

            <div className="stock-in-layout">
                {/* Form */}
                <div className="stock-form-card">
                    <h3>إضافة منتجات</h3>

                    <div className="form-group">
                        <label>المورد *</label>
                        <select
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                            required
                            disabled={!canCreateTransaction}
                        >
                            <option value="">اختر المورد...</option>
                            {suppliers.map(supplier => (
                                <option key={supplier.id} value={supplier.id}>
                                    {supplier.name}
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
                                        setCostPrice(product.costPrice || '');
                                    }
                                }}
                                disabled={!canCreateTransaction}
                            >
                                <option value="">اختر منتج...</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} (المتوفر: {product.quantity})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>الكمية</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                disabled={!canCreateTransaction}
                            />
                        </div>

                        <div className="form-group">
                            <label>سعر التكلفة</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={costPrice}
                                onChange={(e) => setCostPrice(e.target.value)}
                                placeholder="0.00"
                                disabled={!canCreateTransaction}
                            />
                        </div>

                        <button
                            type="button"
                            className="add-product-btn"
                            onClick={handleAddToCart}
                            disabled={!selectedProduct || !quantity || !costPrice || !canCreateTransaction}
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
                        سلة الاستلام
                        <span className="cart-badge">{cart.length} منتج</span>
                    </h3>

                    {cart.length === 0 ? (
                        <p className="cart-empty">اختر منتجات لإضافتها للسلة</p>
                    ) : (
                        <>
                            <ul className="cart-items">
                                {cart.map(item => (
                                    <li key={item.productId} className="cart-item">
                                        <div className="cart-item-info">
                                            <span className="cart-item-name">{item.productName}</span>
                                            <span className="cart-item-details">
                                                {item.quantity} × {formatCurrency(item.costPrice, currency)}
                                            </span>
                                        </div>
                                        <span className="cart-item-total">
                                            {formatCurrency(item.quantity * item.costPrice, currency)}
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
                                <div className="summary-row total">
                                    <span>إجمالي التكلفة:</span>
                                    <span>{formatCurrency(totalCost, currency)}</span>
                                </div>
                            </div>

                            {canCreateTransaction && (
                                <button
                                    className="submit-btn"
                                    onClick={handleSubmit}
                                    disabled={!supplierId || cart.length === 0 || txStatus === 'loading'}
                                >
                                    {txStatus === 'loading' ? 'جاري التسجيل...' : 'تأكيد استلام البضاعة'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockInPage;
