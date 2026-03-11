import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { userService } from '../../../services/userService';
import { publicProductService } from '../../../services/publicProductService';
import { publicOrderService } from '../../../services/publicOrderService';
import { buildCartKey, getAvailableStockForSelection, hasColorVariants, normalizeSelectedColor } from '../../../utils/cartUtils';
import { formatCurrency } from '../../../utils/currency';
import { fromCents } from '../../../utils/decimalUtils';
import {
    MdAddShoppingCart,
    MdArrowBack,
    MdCreditScore,
    MdDelete,
    MdLocalPrintshop,
    MdPointOfSale,
    MdQrCodeScanner,
    MdRefresh,
    MdRemove,
    MdWarningAmber,
} from 'react-icons/md';
import './PosPage.css';

const buildLineFromProduct = (product, selectedColor = null) => {
    const normalizedColor = normalizeSelectedColor(product, selectedColor);
    const availableStock = getAvailableStockForSelection(product, normalizedColor);
    return {
        lineId: buildCartKey(product.id, normalizedColor),
        productId: product.id,
        productCode: product.code || '',
        productName: product.name,
        image: product.images?.[0] || '',
        price: Number(product.price || 0),
        quantity: 1,
        selectedColor: normalizedColor,
        availableStock,
    };
};

const PosPage = () => {
    const { userProfile } = useSelector((state) => state.auth);
    const { currency } = useSelector((state) => state.company);
    const roles = userProfile?.roles || [];
    const canUsePos = userService.canPerformAction(roles, 'USE_POS');

    const [scanValue, setScanValue] = useState('');
    const [cartLines, setCartLines] = useState([]);
    const [catalogAudit, setCatalogAudit] = useState(null);
    const [auditStatus, setAuditStatus] = useState('loading');
    const [pendingVariantProduct, setPendingVariantProduct] = useState(null);
    const [selectedVariantKey, setSelectedVariantKey] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [lineErrors, setLineErrors] = useState({});
    const [completedSale, setCompletedSale] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const loadAudit = async () => {
            try {
                const audit = await publicProductService.getPosCatalogAudit();
                if (!isMounted) return;
                setCatalogAudit(audit);
                setAuditStatus('succeeded');
            } catch (error) {
                if (!isMounted) return;
                setAuditStatus('failed');
                setLookupError(error?.message || 'تعذر تحميل جاهزية نقطة البيع.');
            }
        };

        loadAudit();
        return () => {
            isMounted = false;
        };
    }, []);

    const subtotal = useMemo(
        () => cartLines.reduce((sum, line) => sum + (line.price * line.quantity), 0),
        [cartLines]
    );

    const resetSale = () => {
        setCartLines([]);
        setCustomerName('');
        setCustomerPhone('');
        setNote('');
        setLineErrors({});
        setGeneralError('');
        setLookupError('');
        setCompletedSale(null);
    };

    const addLine = (line) => {
        setCartLines((current) => {
            const existingIndex = current.findIndex((entry) => entry.lineId === line.lineId);
            if (existingIndex === -1) {
                return [...current, line];
            }

            const next = [...current];
            const requestedQuantity = next[existingIndex].quantity + 1;
            const maxAllowed = Number.isFinite(next[existingIndex].availableStock)
                ? Math.min(requestedQuantity, next[existingIndex].availableStock)
                : requestedQuantity;
            next[existingIndex] = {
                ...next[existingIndex],
                quantity: maxAllowed,
            };
            return next;
        });

        setLineErrors((current) => {
            const next = { ...current };
            delete next[line.lineId];
            return next;
        });
    };

    const handleScanSubmit = async (event) => {
        event.preventDefault();
        if (!scanValue.trim() || !catalogAudit?.ready) return;

        setLookupError('');
        setGeneralError('');
        setCompletedSale(null);

        try {
            const product = await publicProductService.getProductByScanValue(scanValue);
            if (!product) {
                setLookupError('لم يتم العثور على منتج بهذا الكود.');
                return;
            }

            if (hasColorVariants(product)) {
                const availableVariants = (product.colorVariants || []).filter((variant) => Number(variant.quantity || 0) > 0);
                if (availableVariants.length === 0) {
                    setLookupError('هذا المنتج غير متوفر حالياً.');
                    return;
                }

                if (availableVariants.length === 1) {
                    addLine(buildLineFromProduct(product, availableVariants[0]));
                } else {
                    setPendingVariantProduct(product);
                    setSelectedVariantKey('');
                }
            } else {
                addLine(buildLineFromProduct(product));
            }
        } catch (error) {
            setLookupError(error?.message || 'حدث خطأ أثناء البحث عن المنتج.');
        } finally {
            setScanValue('');
        }
    };

    const confirmVariantSelection = () => {
        if (!pendingVariantProduct || !selectedVariantKey) return;
        const selectedVariant = pendingVariantProduct.colorVariants.find(
            (variant) => normalizeSelectedColor(pendingVariantProduct, variant)?.colorKey === selectedVariantKey
        );
        if (!selectedVariant) return;

        addLine(buildLineFromProduct(pendingVariantProduct, selectedVariant));
        setPendingVariantProduct(null);
        setSelectedVariantKey('');
    };

    const updateLineQuantity = (lineId, nextQuantity) => {
        setCartLines((current) => current
            .map((line) => {
                if (line.lineId !== lineId) return line;
                const boundedQuantity = nextQuantity <= 0
                    ? 0
                    : (
                        Number.isFinite(line.availableStock)
                            ? Math.min(nextQuantity, line.availableStock)
                            : nextQuantity
                    );
                return {
                    ...line,
                    quantity: boundedQuantity,
                };
            })
            .filter((line) => line.quantity > 0));
    };

    const handleSubmitSale = async () => {
        if (!cartLines.length || !catalogAudit?.ready) return;

        setSubmitting(true);
        setGeneralError('');
        setLineErrors({});

        try {
            const order = await publicOrderService.createPosSale({
                customerName,
                customerPhone,
                notes: note,
                items: cartLines.map((line) => ({
                    productId: line.productId,
                    quantity: line.quantity,
                    selectedColor: line.selectedColor,
                })),
            });

            setCompletedSale(order);
            setCartLines([]);
            setCustomerName('');
            setCustomerPhone('');
            setNote('');
        } catch (error) {
            const details = error?.details?.details || {};
            const errorMessage = error?.message || 'تعذر إتمام عملية البيع.';
            if (details?.productId) {
                const lineId = buildCartKey(details.productId, details?.color ? { color: details.color, colorKey: details.color } : null);
                setLineErrors({
                    [lineId]: errorMessage,
                });
            }
            setGeneralError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (!canUsePos) {
        return (
            <div className="text-center py-5">
                <h3>غير مصرح لك بالوصول إلى نقطة البيع</h3>
            </div>
        );
    }

    return (
        <div className="pos-page">
            <div className="pos-header">
                <div>
                    <p className="pos-eyebrow">Sales Gateway</p>
                    <h1><MdPointOfSale /> نقطة البيع</h1>
                    <p className="pos-subtitle">بيع مباشر سريع باستخدام كود المنتج الآن، مع جاهزية لإضافة الباركود لاحقاً.</p>
                </div>
                <div className="pos-header-actions">
                    <button type="button" className="btn btn-outline-light" onClick={() => window.history.back()}>
                        <MdArrowBack /> رجوع
                    </button>
                    <button type="button" className="btn btn-outline-gold" onClick={resetSale}>
                        <MdRefresh /> عملية جديدة
                    </button>
                </div>
            </div>

            {auditStatus === 'loading' ? (
                <div className="pos-state-card">جاري فحص جاهزية الكتالوج لنقطة البيع...</div>
            ) : null}

            {auditStatus === 'failed' ? (
                <div className="pos-state-card error">{lookupError}</div>
            ) : null}

            {catalogAudit && !catalogAudit.ready ? (
                <section className="pos-audit-panel">
                    <div className="pos-audit-head">
                        <h2><MdWarningAmber /> نقطة البيع متوقفة حتى تصحيح أكواد المنتجات</h2>
                        <p>يجب أن يكون لكل منتج كود فريد قبل تفعيل البيع السريع.</p>
                    </div>
                    <div className="pos-audit-grid">
                        <article>
                            <h3>منتجات بدون كود</h3>
                            <ul>
                                {catalogAudit.missingCodes.map((item) => (
                                    <li key={item.id}>{item.name}</li>
                                ))}
                            </ul>
                        </article>
                        <article>
                            <h3>أكواد مكررة</h3>
                            <ul>
                                {catalogAudit.duplicateCodes.map((item) => (
                                    <li key={item.code}>
                                        <strong dir="ltr">{item.code}</strong> - {item.products.map((product) => product.name).join('، ')}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </div>
                </section>
            ) : null}

            <div className="pos-grid">
                <section className="pos-panel pos-panel-main">
                    <form className="scan-box" onSubmit={handleScanSubmit}>
                        <label htmlFor="pos-scan">
                            <MdQrCodeScanner /> أدخل كود المنتج
                        </label>
                        <div className="scan-row">
                            <input
                                id="pos-scan"
                                type="text"
                                dir="ltr"
                                value={scanValue}
                                onChange={(event) => setScanValue(event.target.value)}
                                placeholder="BAG-001"
                                disabled={!catalogAudit?.ready}
                                autoFocus
                            />
                            <button type="submit" className="btn btn-gold" disabled={!catalogAudit?.ready}>
                                <MdAddShoppingCart /> إضافة
                            </button>
                        </div>
                        {lookupError ? <p className="form-error">{lookupError}</p> : null}
                    </form>

                    {pendingVariantProduct ? (
                        <div className="variant-picker">
                            <div className="variant-picker-head">
                                <h3>اختر اللون لـ {pendingVariantProduct.name}</h3>
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPendingVariantProduct(null)}>
                                    إلغاء
                                </button>
                            </div>
                            <div className="variant-options">
                                {pendingVariantProduct.colorVariants
                                    .filter((variant) => Number(variant.quantity || 0) > 0)
                                    .map((variant) => {
                                        const normalized = normalizeSelectedColor(pendingVariantProduct, variant);
                                        return (
                                            <button
                                                key={normalized?.colorKey || variant.color}
                                                type="button"
                                                className={`variant-option ${selectedVariantKey === normalized?.colorKey ? 'selected' : ''}`}
                                                onClick={() => setSelectedVariantKey(normalized?.colorKey || '')}
                                            >
                                                <span className="swatch" style={{ backgroundColor: variant.colorCode || '#000000' }} />
                                                <span>{variant.color}</span>
                                                <small>{variant.quantity} قطعة</small>
                                            </button>
                                        );
                                    })}
                            </div>
                            <button type="button" className="btn btn-gold mt-3" onClick={confirmVariantSelection} disabled={!selectedVariantKey}>
                                تأكيد الإضافة
                            </button>
                        </div>
                    ) : null}

                    <div className="pos-panel-card">
                        <div className="section-head">
                            <h2>سلة نقطة البيع</h2>
                            <span>{cartLines.length} عنصر</span>
                        </div>

                        {cartLines.length === 0 ? (
                            <div className="empty-state">ابدأ بإدخال كود المنتج لإضافة العناصر هنا.</div>
                        ) : (
                            <div className="pos-cart-list">
                                {cartLines.map((line) => (
                                    <article key={line.lineId} className="pos-cart-item">
                                        <div>
                                            <h3>{line.productName}</h3>
                                            <p dir="ltr">{line.productCode}</p>
                                            {line.selectedColor ? (
                                                <span className="line-color">
                                                    <span className="swatch" style={{ backgroundColor: line.selectedColor.colorCode || '#000000' }} />
                                                    {line.selectedColor.color}
                                                </span>
                                            ) : null}
                                            {lineErrors[line.lineId] ? (
                                                <p className="form-error">{lineErrors[line.lineId]}</p>
                                            ) : null}
                                        </div>
                                        <div className="line-controls">
                                            <strong>{formatCurrency(fromCents(line.price * line.quantity), currency)}</strong>
                                            <div className="qty-controls">
                                                <button type="button" onClick={() => updateLineQuantity(line.lineId, line.quantity - 1)}>
                                                    <MdRemove />
                                                </button>
                                                <span>{line.quantity}</span>
                                                <button type="button" onClick={() => updateLineQuantity(line.lineId, line.quantity + 1)}>
                                                    <MdAddShoppingCart />
                                                </button>
                                            </div>
                                            <button type="button" className="line-remove" onClick={() => updateLineQuantity(line.lineId, 0)}>
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="pos-panel pos-panel-side">
                    <div className="pos-panel-card">
                        <div className="section-head">
                            <h2>بيانات العميل</h2>
                            <span>اختياري</span>
                        </div>
                        <div className="field-grid">
                            <label>
                                الاسم
                                <input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                            </label>
                            <label>
                                الهاتف
                                <input type="text" dir="ltr" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
                            </label>
                            <label className="full-width">
                                ملاحظات العملية
                                <textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} />
                            </label>
                        </div>
                    </div>

                    <div className="pos-panel-card">
                        <div className="section-head">
                            <h2>الدفع</h2>
                            <span><MdCreditScore /> نقدي</span>
                        </div>
                        <div className="totals-box">
                            <div>
                                <span>المجموع</span>
                                <strong>{formatCurrency(fromCents(subtotal), currency)}</strong>
                            </div>
                            <div>
                                <span>طريقة الدفع</span>
                                <strong>Cash</strong>
                            </div>
                        </div>
                        {generalError ? <p className="form-error mt-3">{generalError}</p> : null}
                        <button type="button" className="btn btn-gold w-100 mt-3" disabled={!cartLines.length || submitting || !catalogAudit?.ready} onClick={handleSubmitSale}>
                            {submitting ? 'جاري الإتمام...' : 'إتمام البيع'}
                        </button>
                    </div>

                    {completedSale ? (
                        <div className="pos-panel-card receipt-card">
                            <div className="section-head">
                                <h2>إيصال العملية</h2>
                                <button type="button" className="btn btn-sm btn-outline-gold" onClick={() => window.print()}>
                                    <MdLocalPrintshop /> طباعة
                                </button>
                            </div>
                            <div className="receipt-preview">
                                <p><strong>رقم العملية:</strong> <span dir="ltr">{completedSale.orderNumber}</span></p>
                                <p><strong>القناة:</strong> POS</p>
                                <p><strong>العميل:</strong> {completedSale.customer?.name || 'عميل مباشر'}</p>
                                <p><strong>الإجمالي:</strong> {formatCurrency(fromCents(completedSale.total || 0), currency)}</p>
                                <div className="receipt-items">
                                    {(completedSale.items || []).map((item, index) => (
                                        <div key={`${item.productId}-${index}`}>
                                            <span>{item.productName}</span>
                                            <strong>{item.quantity} × {formatCurrency(fromCents(item.price || 0), currency)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </aside>
            </div>
        </div>
    );
};

export default PosPage;
