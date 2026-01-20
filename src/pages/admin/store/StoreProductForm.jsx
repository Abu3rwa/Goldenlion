import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { addPublicProduct, updatePublicProduct, fetchPublicProductById, clearCurrentProduct } from '../../../store/publicProductsSlice';
import { toCents, fromCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import { MdSave, MdArrowBack, MdAddPhotoAlternate, MdDelete, MdAdd, MdColorLens } from 'react-icons/md';
import './StoreProductForm.css';

const StoreProductForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const { currentProduct } = useSelector((state) => state.publicProducts);
    const { userProfile } = useSelector((state) => state.auth);

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [images, setImages] = useState([]);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [inStock, setInStock] = useState(true);
    const [featured, setFeatured] = useState(false);
    const [hasDelivery, setHasDelivery] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);
    const [costPrice, setCostPrice] = useState('');

    // Color Variants
    const [colorVariants, setColorVariants] = useState([]);
    const [newColor, setNewColor] = useState('');
    const [newColorCode, setNewColorCode] = useState('#000000');
    const [newColorQty, setNewColorQty] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canManage = userService.canPerformAction(
        userProfile?.roles || [],
        'MANAGE_PUBLIC_PRODUCTS'
    );

    useEffect(() => {
        if (isEditing) {
            dispatch(fetchPublicProductById(id));
        }
        return () => {
            dispatch(clearCurrentProduct());
        };
    }, [dispatch, id, isEditing]);

    useEffect(() => {
        if (isEditing && currentProduct) {
            setCode(currentProduct.code || '');
            setName(currentProduct.name || '');
            setNameEn(currentProduct.nameEn || '');
            setDescription(currentProduct.description || '');
            setPrice(fromCents(currentProduct.price || 0).toString());
            setImages(currentProduct.images || []);
            setInStock(currentProduct.inStock !== false);
            setFeatured(currentProduct.featured || false);
            setHasDelivery(currentProduct.hasDelivery !== false);
            setSortOrder(currentProduct.sortOrder || 0);
            setCostPrice(fromCents(currentProduct.costPrice || 0).toString());
            setColorVariants(currentProduct.colorVariants || []);
        }
    }, [currentProduct, isEditing]);

    const handleAddImage = () => {
        if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
            setImages([...images, newImageUrl.trim()]);
            setNewImageUrl('');
        }
    };

    const handleRemoveImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    // Color Variants Handlers
    const handleAddColorVariant = () => {
        if (!newColor.trim() || !newColorQty || parseInt(newColorQty) <= 0) return;

        const exists = colorVariants.some(v => v.color.toLowerCase() === newColor.trim().toLowerCase());
        if (exists) {
            setError('هذا اللون موجود بالفعل');
            return;
        }

        setColorVariants([
            ...colorVariants,
            {
                color: newColor.trim(),
                colorCode: newColorCode,
                quantity: parseInt(newColorQty)
            }
        ]);
        setNewColor('');
        setNewColorCode('#000000');
        setNewColorQty('');
        setError('');
    };

    const handleRemoveColorVariant = (index) => {
        setColorVariants(colorVariants.filter((_, i) => i !== index));
    };

    const handleUpdateVariantQty = (index, qty) => {
        const updated = [...colorVariants];
        updated[index].quantity = parseInt(qty) || 0;
        setColorVariants(updated);
    };

    // Calculate total stock from variants
    const totalStock = colorVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('اسم المنتج مطلوب');
            return;
        }

        if (!price || parseFloat(price) <= 0) {
            setError('السعر غير صالح');
            return;
        }

        setLoading(true);

        const productData = {
            code: code.trim(),
            name: name.trim(),
            nameEn: nameEn.trim(),
            description: description.trim(),
            price: toCents(parseFloat(price)),
            costPrice: toCents(parseFloat(costPrice) || 0),
            images,
            inStock: colorVariants.length > 0 ? totalStock > 0 : inStock,
            featured,
            hasDelivery,
            sortOrder: parseInt(sortOrder) || 0,
            colorVariants: colorVariants,
            totalStock: totalStock
        };

        try {
            if (isEditing) {
                await dispatch(updatePublicProduct({ id, productData })).unwrap();
            } else {
                await dispatch(addPublicProduct({ productData, userId: userProfile?.id })).unwrap();
            }
            navigate('/admin/store/products');
        } catch (err) {
            console.error('Error saving product:', err);
            setError(err?.message || 'حدث خطأ أثناء الحفظ');
            setLoading(false);
            return; // Prevent any further action
        }
        setLoading(false);
    };

    if (!canManage) {
        return (
            <div className="text-center py-5">
                <h3>غير مصرح لك بالوصول إلى هذه الصفحة</h3>
            </div>
        );
    }

    return (
        <div className="store-product-form">
            <div className="page-header d-flex align-items-center gap-3 mb-4">
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                    <MdArrowBack />
                </button>
                <h1 className="h3 mb-0">
                    {isEditing ? '✏️ تعديل منتج' : '✨ إضافة منتج جديد'}
                </h1>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-3">
                    {/* Left Column - Basic Info & Images */}
                    <div className="col-lg-6">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-header bg-white py-2">
                                <h6 className="mb-0 fw-bold">معلومات المنتج</h6>
                            </div>
                            <div className="card-body py-2">
                                <div className="row g-2">
                                    <div className="col-6">
                                        <label className="form-label small mb-1">اسم المنتج *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="شنطة كتف أنيقة"
                                            required
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small mb-1">الاسم بالإنجليزية</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={nameEn}
                                            onChange={(e) => setNameEn(e.target.value)}
                                            placeholder="Shoulder Bag"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="col-4">
                                        <label className="form-label small mb-1">الكود</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="BAG-001"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="col-4">
                                        <label className="form-label small mb-1">سعر البيع *</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="col-4">
                                        <label className="form-label small mb-1">سعر التكلفة</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={costPrice}
                                            onChange={(e) => setCostPrice(e.target.value)}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small mb-1">الوصف</label>
                                        <textarea
                                            className="form-control form-control-sm"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows="2"
                                            placeholder="وصف المنتج..."
                                        />
                                    </div>
                                    {/* Compact Image Input */}
                                    <div className="col-12">
                                        <label className="form-label small mb-1">صور المنتج</label>
                                        <div className="input-group input-group-sm">
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={newImageUrl}
                                                onChange={(e) => setNewImageUrl(e.target.value)}
                                                placeholder="رابط الصورة"
                                                dir="ltr"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-gold"
                                                onClick={handleAddImage}
                                            >
                                                <MdAddPhotoAlternate />
                                            </button>
                                        </div>
                                        {images.length > 0 && (
                                            <div className="d-flex flex-wrap gap-2 mt-2">
                                                {images.map((img, index) => (
                                                    <div key={index} className="image-thumb">
                                                        <img src={img} alt={`صورة ${index + 1}`} />
                                                        <button
                                                            type="button"
                                                            className="remove-btn"
                                                            onClick={() => handleRemoveImage(index)}
                                                        >×</button>
                                                        {index === 0 && <span className="main-tag">رئيسية</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Colors & Settings */}
                    <div className="col-lg-6">
                        <div className="row g-3">
                            {/* Color Variants */}
                            <div className="col-12">
                                <div className="card border-0 shadow-sm">
                                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                                        <h6 className="mb-0 fw-bold">
                                            <MdColorLens className="me-1" /> الألوان والمخزون
                                        </h6>
                                        {colorVariants.length > 0 && (
                                            <span className="badge bg-gold text-dark">المخزون: {totalStock}</span>
                                        )}
                                    </div>
                                    <div className="card-body py-2">
                                        <div className="row g-2 align-items-end mb-2">
                                            <div className="col-5">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={newColor}
                                                    onChange={(e) => setNewColor(e.target.value)}
                                                    placeholder="اسم اللون"
                                                />
                                            </div>
                                            <div className="col-2">
                                                <input
                                                    type="color"
                                                    className="form-control form-control-sm form-control-color w-100"
                                                    value={newColorCode}
                                                    onChange={(e) => setNewColorCode(e.target.value)}
                                                />
                                            </div>
                                            <div className="col-3">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={newColorQty}
                                                    onChange={(e) => setNewColorQty(e.target.value)}
                                                    min="1"
                                                    placeholder="الكمية"
                                                />
                                            </div>
                                            <div className="col-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-gold w-100"
                                                    onClick={handleAddColorVariant}
                                                    disabled={!newColor.trim() || !newColorQty}
                                                >
                                                    <MdAdd />
                                                </button>
                                            </div>
                                        </div>
                                        {colorVariants.length > 0 ? (
                                            <div className="color-list">
                                                {colorVariants.map((variant, index) => (
                                                    <div key={index} className="color-item">
                                                        <span
                                                            className="color-dot"
                                                            style={{ backgroundColor: variant.colorCode }}
                                                        />
                                                        <span className="color-name">{variant.color}</span>
                                                        <input
                                                            type="number"
                                                            className="qty-input"
                                                            value={variant.quantity}
                                                            onChange={(e) => handleUpdateVariantQty(index, e.target.value)}
                                                            min="0"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="delete-btn"
                                                            onClick={() => handleRemoveColorVariant(index)}
                                                        >
                                                            <MdDelete />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted small text-center mb-0 py-2">أضف ألوان المنتج</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Settings & Submit */}
                            <div className="col-12">
                                <div className="card border-0 shadow-sm">
                                    <div className="card-header bg-white py-2">
                                        <h6 className="mb-0 fw-bold">الإعدادات</h6>
                                    </div>
                                    <div className="card-body py-2">
                                        <div className="d-flex flex-wrap gap-3 mb-3">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="inStock"
                                                    checked={inStock}
                                                    onChange={(e) => setInStock(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="inStock">متوفر</label>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="featured"
                                                    checked={featured}
                                                    onChange={(e) => setFeatured(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="featured">مميز</label>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="hasDelivery"
                                                    checked={hasDelivery}
                                                    onChange={(e) => setHasDelivery(e.target.checked)}
                                                />
                                                <label className="form-check-label small" htmlFor="hasDelivery">توصيل</label>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <label className="form-label small mb-0">ترتيب:</label>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    style={{ width: '60px' }}
                                                    value={sortOrder}
                                                    onChange={(e) => setSortOrder(e.target.value)}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-gold w-100"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <span className="spinner-border spinner-border-sm me-2" />
                                            ) : (
                                                <MdSave className="me-2" />
                                            )}
                                            {isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default StoreProductForm;

