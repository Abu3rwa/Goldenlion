import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/productsSlice';
import { fetchCustomers } from '../store/customersSlice';
import { createStockOut, fetchTransactions, updateTransactionReceiptUrl } from '../store/transactionsSlice';
import { userService } from '../services/userService';
import { storageService } from '../services/storageService';
import { isValidQuantity, isValidPrice, ValidationMessages } from '../utils/validation';
import { formatCurrency } from '../utils/currency';
import { MdArrowUpward, MdAdd, MdDelete, MdCheck, MdError, MdWarning, MdPrint, MdFileDownload, MdCloudUpload, MdVisibility } from 'react-icons/md';
import './StockOutPage.css';
import './StockInPage.css'; // Reuse shared styles
import Receipt from '../components/Receipt';
import PrintWrapper from '../components/PrintWrapper';
import { generatePDF, generatePDFBlob } from '../utils/pdfGenerator';
import { toCents, calculateLineTotal } from '../utils/decimalUtils';

const StockOutPage = () => {
    const dispatch = useDispatch();
    const { products } = useSelector((state) => state.products);
    const { customers } = useSelector((state) => state.customers);
    const { status: txStatus, error: txError } = useSelector((state) => state.transactions);
    const { userProfile } = useSelector((state) => state.auth);
    const { currency, companyName, address, phone, terms } = useSelector((state) => state.company);

    const [customerId, setCustomerId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [validationError, setValidationError] = useState('');
    const [lastTransaction, setLastTransaction] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('idle');
    const [receiptUrl, setReceiptUrl] = useState(null);

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
        setLastTransaction(null);
        setUploadStatus('idle');
        setReceiptUrl(null);

        // Prepare data for receipt preview
        const txDataForPrint = {
            id: 'قيد الانتظار...',
            type: 'STOCK_OUT',
            customerName: selectedCustomer?.name,
            items: cart.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPriceCents: toCents(item.sellingPrice),
                lineTotalCents: calculateLineTotal(item.quantity, toCents(item.sellingPrice))
            })),
            totalPriceCents: toCents(totalSales),
            notes,
            createdBy: { 
                email: userProfile?.email,
                displayName: userProfile?.displayName || userProfile?.name || 'System'
            },
            createdAt: new Date()
        };

        const result = await dispatch(createStockOut({
            customerId,
            customerName: selectedCustomer?.name || '',
            items: cart,
            notes
        }));

        if (!result.error) {
            const txId = result.payload.id;
            const finalTxData = { ...txDataForPrint, id: txId, displayId: result.payload.displayId };

            setSuccessMessage('تم تسجيل خروج البضاعة بنجاح!');
            setLastTransaction(finalTxData);
            setCart([]);
            setNotes('');
            setCustomerId('');
            
            dispatch(fetchProducts());
            dispatch(fetchTransactions());

            // Auto Upload
            setUploadStatus('uploading');
            try {
                // Short delay to ensure DOM is ready
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const blob = await generatePDFBlob('pdf-receipt-stock-out');
                if (blob) {
                    const url = await storageService.uploadReceipt(blob, `receipt_${txId}.pdf`, userProfile.uid);
                    await dispatch(updateTransactionReceiptUrl({ transactionId: txId, receiptUrl: url }));
                    setReceiptUrl(url);
                    setUploadStatus('success');
                } else {
                    setUploadStatus('error');
                }
            } catch (err) {
                console.error("Auto-upload failed:", err);
                setUploadStatus('error');
            }
        }
    };

    const handlePrint = () => {
        setTimeout(() => {
            window.print();
        }, 800);
    };

    const handleDownloadPdf = async () => {
        if (!lastTransaction) return;
        setIsGeneratingPdf(true);
        await generatePDF('pdf-receipt-stock-out', `receipt-out-${lastTransaction.id}.pdf`);
        setIsGeneratingPdf(false);
    };

    // Calculate totals
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalSales = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    const totalProfit = totalSales - totalCost;

    // Active customers only
    const activeCustomers = customers.filter(c => c.isActive !== false);

    return (
        <div className="stock-out-page container-fluid">
            <h1><MdArrowUpward /> إخراج بضاعة (Stock OUT)</h1>

            {!canCreateTransaction && (
                <div className="alert alert-warning d-flex align-items-center gap-2">
                    <MdError /> لديك صلاحية العرض فقط. لا يمكنك تسجيل إخراج بضاعة.
                </div>
            )}

            {successMessage && (
                <div className="alert alert-success d-flex flex-column gap-2 no-print">
                    <div className="d-flex align-items-center gap-2">
                        <MdCheck /> {successMessage}
                    </div>

                    {/* Upload Status Feedback */}
                    {uploadStatus === 'uploading' && (
                        <div className="small text-muted d-flex align-items-center gap-2">
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            جاري حفظ الإيصال في النظام...
                        </div>
                    )}
                    {uploadStatus === 'success' && (
                        <div className="small text-success d-flex align-items-center gap-2">
                            <MdCloudUpload /> تم حفظ الإيصال الرقمي بنجاح
                        </div>
                    )}

                    {lastTransaction && (
                        <div className="d-flex gap-2 mt-2">
                            <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={handlePrint}>
                                <MdPrint /> طباعة
                            </button>
                            <button 
                                className="btn btn-sm btn-primary d-flex align-items-center gap-1" 
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                            >
                                <MdFileDownload /> {isGeneratingPdf ? 'جاري التحميل...' : 'تحميل PDF'}
                            </button>
                            {receiptUrl && (
                                <a 
                                    href={receiptUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
                                >
                                    <MdVisibility /> عرض الإيصال المحفوظ
                                </a>
                            )}
                        </div>
                    )}
                </div>
            )}

            {txError && (
                <div className="alert alert-danger d-flex align-items-center gap-2">
                    <MdError /> {txError}
                </div>
            )}

            <div className="row">
                {/* Form */}
                <div className="col-lg-8 mb-4">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h3 className="card-title mb-4 text-gold"><MdArrowUpward /> إخراج منتجات للفرع</h3>

                            <div className="mb-3">
                                <label className="form-label">الفرع (العميل) *</label>
                                <select
                                    className="form-select"
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
                                <div className="text-danger mb-3 d-flex align-items-center gap-1">
                                    <MdError /> {validationError}
                                </div>
                            )}

                            <div className="row g-2 align-items-end mb-3">
                                <div className="col-md-5">
                                    <label className="form-label">المنتج</label>
                                    <select
                                        className="form-select"
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
                                        <div className="form-text text-warning">
                                            <MdWarning /> المخزون منخفض! ({currentProduct.quantity} فقط)
                                        </div>
                                    )}
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label">الكمية</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="1"
                                        max={currentProduct?.quantity || 999}
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="0"
                                        disabled={!canCreateTransaction}
                                    />
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label">سعر البيع</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        step="0.01"
                                        min="0"
                                        value={sellingPrice}
                                        onChange={(e) => setSellingPrice(e.target.value)}
                                        placeholder="0.00"
                                        disabled={!canCreateTransaction}
                                    />
                                </div>

                                <div className="col-md-1">
                                    <button
                                        type="button"
                                        className="btn btn-success w-100"
                                        onClick={handleAddToCart}
                                        disabled={!selectedProduct || !quantity || !sellingPrice || !canCreateTransaction}
                                    >
                                        <MdAdd />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">ملاحظات</label>
                                <textarea
                                    className="form-control"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="أي ملاحظات على هذه الشحنة..."
                                    rows={3}
                                    disabled={!canCreateTransaction}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cart */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h3 className="card-title d-flex justify-content-between align-items-center mb-4">
                                سلة الإخراج
                                <span className="badge bg-gold text-dark">{cart.length} منتج</span>
                            </h3>

                            {cart.length === 0 ? (
                                <p className="text-muted text-center py-4">اختر منتجات لإخراجها للفرع</p>
                            ) : (
                                <>
                                    <ul className="list-group list-group-flush mb-3">
                                        {cart.map(item => (
                                            <li key={item.productId} className="list-group-item d-flex justify-content-between align-items-center bg-light rounded mb-2 border-0">
                                                <div>
                                                    <div className="fw-bold">{item.productName}</div>
                                                    <small className="text-muted">
                                                        {item.quantity} × {formatCurrency(item.sellingPrice, currency)}
                                                    </small>
                                                </div>
                                                <div className="text-end">
                                                    <div className="fw-bold text-gold">
                                                        {formatCurrency(item.quantity * item.sellingPrice, currency)}
                                                    </div>
                                                    {canCreateTransaction && (
                                                        <button
                                                            className="btn btn-link text-danger p-0 mt-1"
                                                            onClick={() => handleRemoveFromCart(item.productId)}
                                                            title="حذف"
                                                        >
                                                            <MdDelete />
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="border-top pt-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>إجمالي الكمية:</span>
                                            <span className="fw-bold">{totalQuantity} وحدة</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>قيمة البيع:</span>
                                            <span>{formatCurrency(totalSales, currency)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>التكلفة:</span>
                                            <span className="text-muted">{formatCurrency(totalCost, currency)}</span>
                                        </div>
                                        <div className={`d-flex justify-content-between mb-2 ${totalProfit < 0 ? 'text-danger' : 'text-success'}`}>
                                            <span>الربح المتوقع:</span>
                                            <span className="fw-bold">{formatCurrency(totalProfit, currency)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-3 fs-5 border-top pt-2">
                                            <span>الإجمالي:</span>
                                            <span className="fw-bold text-dark">{formatCurrency(totalSales, currency)}</span>
                                        </div>
                                    </div>

                                    {canCreateTransaction && (
                                        <button
                                            className="btn btn-gold w-100 fw-bold"
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
            </div>

            {/* Hidden Printable Area */}
            {lastTransaction && (
                <PrintWrapper>
                    <Receipt
                        transaction={lastTransaction}
                        company={{ companyName: companyName || 'الأسد الذهبي', currency, address, phone, terms }}
                    />
                </PrintWrapper>
            )}

            {/* Hidden Area for PDF Generation (Must be visible to DOM, but off-screen) */}
            {lastTransaction && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <div id="pdf-receipt-stock-out" style={{ width: '210mm', backgroundColor: 'white' }}>
                        <Receipt
                            transaction={lastTransaction}
                            company={{ companyName: companyName || 'الأسد الذهبي', currency, address, phone, terms }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOutPage;
