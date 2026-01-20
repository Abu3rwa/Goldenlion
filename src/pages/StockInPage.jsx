import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/productsSlice';
import { fetchSuppliers } from '../store/suppliersSlice';
import { createStockIn, fetchTransactions, updateTransactionReceiptUrl } from '../store/transactionsSlice';
import { userService } from '../services/userService';
import { storageService } from '../services/storageService';
import { isValidQuantity, isValidPrice, ValidationMessages } from '../utils/validation';
import { formatCurrency } from '../utils/currency';
import { MdArrowDownward, MdAdd, MdDelete, MdCheck, MdError, MdPrint, MdFileDownload, MdCloudUpload, MdVisibility } from 'react-icons/md';
import './StockInPage.css';
import Receipt from '../components/Receipt';
import PrintWrapper from '../components/PrintWrapper';
import { generatePDF, generatePDFBlob } from '../utils/pdfGenerator';
import { toCents, calculateLineTotal } from '../utils/decimalUtils';

const StockInPage = () => {
    const dispatch = useDispatch();
    const { products } = useSelector((state) => state.products);
    const { suppliers } = useSelector((state) => state.suppliers);
    const { status: txStatus, error: txError } = useSelector((state) => state.transactions);
    const { userProfile } = useSelector((state) => state.auth);
    const { currency, companyName, companyNameEn, address, phone, terms } = useSelector((state) => state.company);

    const [supplierId, setSupplierId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [validationError, setValidationError] = useState('');
    const [lastTransaction, setLastTransaction] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
    const [receiptUrl, setReceiptUrl] = useState(null);

    const canCreateTransaction = userService.canPerformAction(userProfile?.roles || [], 'CREATE_TRANSACTION');

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
        setLastTransaction(null);
        setUploadStatus('idle');
        setReceiptUrl(null);

        // Prepare data for receipt preview
        const txDataForPrint = {
            id: 'قيد الانتظار...',
            type: 'STOCK_IN',
            supplierName: selectedSupplier?.name,
            items: cart.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitCostCents: toCents(item.costPrice),
                lineTotalCents: calculateLineTotal(item.quantity, toCents(item.costPrice))
            })),
            totalCostCents: toCents(totalCost),
            notes,
            createdBy: {
                email: userProfile?.email,
                displayName: userProfile?.displayName || userProfile?.name || 'System'
            },
            createdAt: new Date()
        };

        // 1. Create Transaction
        const result = await dispatch(createStockIn({
            supplierId,
            supplierName: selectedSupplier?.name || '',
            items: cart,
            notes,
        }));

        if (!result.error) {
            const txId = result.payload.id;
            const finalTxData = { ...txDataForPrint, id: txId, displayId: result.payload.displayId };

            setSuccessMessage('تم تسجيل استلام البضاعة بنجاح!');
            setLastTransaction(finalTxData);
            setCart([]);
            setNotes('');
            setSupplierId('');

            dispatch(fetchProducts());
            dispatch(fetchTransactions());

            // 2. Auto-Generate and Upload PDF
            setUploadStatus('uploading');
            try {
                // Short delay to ensure DOM is ready with the new receipt
                await new Promise(resolve => setTimeout(resolve, 500));

                const blob = await generatePDFBlob('pdf-receipt-stock-in');
                if (blob) {
                    const url = await storageService.uploadReceipt(blob, `receipt_${txId}.pdf`, userProfile.uid);
                    await dispatch(updateTransactionReceiptUrl({ transactionId: txId, receiptUrl: url }));
                    setReceiptUrl(url);
                    setUploadStatus('success');
                } else {
                    setUploadStatus('error');
                    console.error("Failed to generate PDF Blob");
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
        await generatePDF('pdf-receipt-stock-in', `receipt-in-${lastTransaction.id}.pdf`);
        setIsGeneratingPdf(false);
    };

    // Calculate totals
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    return (
        <div className="stock-in-page container-fluid">
            <h1><MdArrowDownward /> استلام بضاعة (Stock IN)</h1>

            {!canCreateTransaction && (
                <div className="alert alert-warning d-flex align-items-center gap-2">
                    <MdError /> لديك صلاحية العرض فقط. لا يمكنك تسجيل استلام بضاعة.
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
                            <h3 className="card-title mb-4 text-gold"><MdAdd /> إضافة منتجات</h3>

                            <div className="mb-3">
                                <label className="form-label">المورد *</label>
                                <select
                                    className="form-select"
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

                                <div className="col-md-3">
                                    <label className="form-label">الكمية</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="0"
                                        disabled={!canCreateTransaction}
                                    />
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label">سعر التكلفة</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        step="0.01"
                                        min="0"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        placeholder="0.00"
                                        disabled={!canCreateTransaction}
                                    />
                                </div>

                                <div className="col-md-1">
                                    <button
                                        type="button"
                                        className="btn btn-success w-100"
                                        onClick={handleAddToCart}
                                        disabled={!selectedProduct || !quantity || !costPrice || !canCreateTransaction}
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
                                سلة الاستلام
                                <span className="badge bg-gold text-dark">{cart.length} منتج</span>
                            </h3>

                            {cart.length === 0 ? (
                                <p className="text-muted text-center py-4">اختر منتجات لإضافتها للسلة</p>
                            ) : (
                                <>
                                    <ul className="list-group list-group-flush mb-3">
                                        {cart.map(item => (
                                            <li key={item.productId} className="list-group-item d-flex justify-content-between align-items-center bg-light rounded mb-2 border-0">
                                                <div>
                                                    <div className="fw-bold">{item.productName}</div>
                                                    <small className="text-muted">
                                                        {item.quantity} × {formatCurrency(item.costPrice, currency)}
                                                    </small>
                                                </div>
                                                <div className="text-end">
                                                    <div className="fw-bold text-gold">
                                                        {formatCurrency(item.quantity * item.costPrice, currency)}
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
                                        <div className="d-flex justify-content-between mb-3 fs-5">
                                            <span>إجمالي التكلفة:</span>
                                            <span className="fw-bold text-dark">{formatCurrency(totalCost, currency)}</span>
                                        </div>
                                    </div>

                                    {canCreateTransaction && (
                                        <button
                                            className="btn btn-gold w-100 fw-bold"
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
            </div>

            {/* Assuming useSelector is defined earlier in the component, adding companyNameEn */}
            {/* If useSelector is not defined, this line should be placed at the top of the functional component */}
            {/* For the purpose of this edit, we'll assume it's already there and just needs modification */}
            {/* If it's not, you would typically add it like: */}
            {/* const { currency, companyName, companyNameEn, address, phone, terms } = useSelector((state) => state.company); */}

            {/* Hidden Printable Area for Browser Print */}
            {lastTransaction && (
                <PrintWrapper>
                    <Receipt
                        transaction={lastTransaction}
                        company={{ companyName: companyName || 'الأسد الذهبي', companyNameEn, currency, address, phone, terms }}
                    />
                </PrintWrapper>
            )}

            {/* Hidden Area for PDF Generation (Must be visible to DOM, but off-screen) */}
            {lastTransaction && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <div id="pdf-receipt-stock-in" style={{ width: '210mm', backgroundColor: 'white' }}>
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

export default StockInPage;
