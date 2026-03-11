import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { addPublicProduct, updatePublicProduct, fetchPublicProductById, clearCurrentProduct } from '../../../store/publicProductsSlice';
import { addPublicCategory, fetchPublicCategories } from '../../../store/publicCategoriesSlice';
import { toCents, fromCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import { MdSave, MdArrowBack, MdAddPhotoAlternate, MdDelete, MdAdd, MdColorLens, MdCategory } from 'react-icons/md';
import './StoreProductForm.css';

const StoreProductForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const { currentProduct } = useSelector((state) => state.publicProducts);
    const { userProfile } = useSelector((state) => state.auth);
    const { categories } = useSelector((state) => state.publicCategories);

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categoryMode, setCategoryMode] = useState('existing');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [price, setPrice] = useState('');
    const [images, setImages] = useState([]);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [inStock, setInStock] = useState(true);
    const [featured, setFeatured] = useState(false);
    const [hasDelivery, setHasDelivery] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);
    const [costPrice, setCostPrice] = useState('');
    const [barcode, setBarcode] = useState('');
    const [sku, setSku] = useState('');
    const [minimumStock, setMinimumStock] = useState('');
    const [reorderPoint, setReorderPoint] = useState('');
    const [leadTimeDays, setLeadTimeDays] = useState('');
    const [preferredSupplierId, setPreferredSupplierId] = useState('');

    // Color Variants
    const [colorVariants, setColorVariants] = useState([]);
    const [newColor, setNewColor] = useState('');
    const [newColorCode, setNewColorCode] = useState('#000000');
    const [newColorQty, setNewColorQty] = useState('');

    const [loading, setLoading] = useState(false);
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [error, setError] = useState('');

    const canManage = userService.canPerformAction(
        userProfile?.roles || [],
        'MANAGE_PUBLIC_PRODUCTS'
    );

    useEffect(() => {
        dispatch(fetchPublicCategories());
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
            setCategoryId(currentProduct.categoryId || '');
            setCategoryMode('existing');
            setNewCategoryName('');
            setPrice(fromCents(currentProduct.price || 0).toString());
            setImages(currentProduct.images || []);
            setInStock(currentProduct.inStock !== false);
            setFeatured(currentProduct.featured || false);
            setHasDelivery(currentProduct.hasDelivery !== false);
            setSortOrder(currentProduct.sortOrder || 0);
            setCostPrice(fromCents(currentProduct.costPrice || 0).toString());
            setBarcode(currentProduct.barcode || '');
            setSku(currentProduct.sku || '');
            setMinimumStock(`${currentProduct.minimumStock || 0}`);
            setReorderPoint(`${currentProduct.reorderPoint || 0}`);
            setLeadTimeDays(`${currentProduct.leadTimeDays || 0}`);
            setPreferredSupplierId(currentProduct.preferredSupplierId || '');
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

    const findCategoryByName = (rawName) => {
        const normalizedName = `${rawName || ''}`.trim().toLowerCase();
        if (!normalizedName) return null;

        return categories.find(
            (category) => `${category?.name || ''}`.trim().toLowerCase() === normalizedName
        ) || null;
    };

    const handleCreateCategory = async () => {
        const normalizedName = `${newCategoryName || ''}`.trim();
        if (!normalizedName) {
            setError('اسم الفئة الجديدة مطلوب');
            return;
        }

        const localMatch = findCategoryByName(normalizedName);
        if (localMatch) {
            setCategoryId(localMatch.id);
            setCategoryMode('existing');
            setNewCategoryName('');
            setError('');
            return;
        }

        setCreatingCategory(true);
        setError('');

        try {
            const createdCategory = await dispatch(
                addPublicCategory({
                    name: normalizedName,
                    userId: userProfile?.id,
                })
            ).unwrap();

            await dispatch(fetchPublicCategories()).unwrap();
            setCategoryId(createdCategory.id);
            setCategoryMode('existing');
            setNewCategoryName('');
        } catch (err) {
            setError(err?.message || 'تعذر إنشاء الفئة');
        } finally {
            setCreatingCategory(false);
        }
    };

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

        if (categoryMode === 'new' && !newCategoryName.trim()) {
            setError('اسم الفئة الجديدة مطلوب');
            return;
        }

        if (categoryMode === 'existing' && !categoryId) {
            setError('يرجى اختيار فئة المنتج');
            return;
        }

        setLoading(true);

        let resolvedCategory = null;

        const productData = {
            code: code.trim(),
            barcode: barcode.trim(),
            sku: sku.trim(),
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
            totalStock: totalStock,
            minimumStock: parseInt(minimumStock, 10) || 0,
            reorderPoint: parseInt(reorderPoint, 10) || 0,
            leadTimeDays: parseInt(leadTimeDays, 10) || 0,
            preferredSupplierId: preferredSupplierId.trim(),
        };

        try {
            if (categoryMode === 'new') {
                const normalizedNewCategory = newCategoryName.trim();
                resolvedCategory = findCategoryByName(normalizedNewCategory);

                if (!resolvedCategory) {
                    resolvedCategory = await dispatch(
                        addPublicCategory({
                            name: normalizedNewCategory,
                            userId: userProfile?.id,
                        })
                    ).unwrap();
                }
            } else {
                resolvedCategory = categories.find((category) => category.id === categoryId);
            }

            if (!resolvedCategory) {
                setError('تعذر تحديد الفئة. حاول مرة أخرى.');
                setLoading(false);
                return;
            }

            productData.categoryId = resolvedCategory.id;
            productData.categoryName = resolvedCategory.name;

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
                                    <div className="col-md-4">
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
                                    <div className="col-md-4">
                                        <label className="form-label small mb-1">Barcode</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            placeholder="0123456789012"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small mb-1">SKU</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            placeholder="GL-BAG-001"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="col-md-4">
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
                                    <div className="col-md-4">
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
                                    <div className="col-md-4">
                                        <label className="form-label small mb-1">الحد الأدنى للمخزون</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={minimumStock}
                                            onChange={(e) => setMinimumStock(e.target.value)}
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small mb-1">نقطة إعادة الطلب</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={reorderPoint}
                                            onChange={(e) => setReorderPoint(e.target.value)}
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small mb-1">مدة التوريد بالأيام</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={leadTimeDays}
                                            onChange={(e) => setLeadTimeDays(e.target.value)}
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small mb-1">معرّف المورد المفضل</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={preferredSupplierId}
                                            onChange={(e) => setPreferredSupplierId(e.target.value)}
                                            placeholder="supplier-001"
                                            dir="ltr"
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
                                    <div className="col-12">
                                        <label className="form-label small mb-1 d-flex align-items-center gap-1">
                                            <MdCategory /> الفئة *
                                        </label>
                                        <div className="d-flex gap-2 mb-2 flex-wrap">
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${categoryMode === 'existing' ? 'btn-gold' : 'btn-outline-secondary'}`}
                                                onClick={() => setCategoryMode('existing')}
                                            >
                                                اختيار فئة
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${categoryMode === 'new' ? 'btn-gold' : 'btn-outline-secondary'}`}
                                                onClick={() => setCategoryMode('new')}
                                            >
                                                إضافة فئة جديدة
                                            </button>
                                        </div>

                                        {categoryMode === 'existing' ? (
                                            <select
                                                className="form-select form-select-sm"
                                                value={categoryId}
                                                onChange={(e) => setCategoryId(e.target.value)}
                                                required
                                            >
                                                <option value="">-- اختر الفئة --</option>
                                                {categories.map((category) => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <>
                                                <div className="input-group input-group-sm">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        placeholder="مثال: شنط يد نسائية"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-gold"
                                                        onClick={handleCreateCategory}
                                                        disabled={creatingCategory || !newCategoryName.trim()}
                                                    >
                                                        {creatingCategory ? 'جاري الإنشاء...' : 'إنشاء الفئة'}
                                                    </button>
                                                </div>
                                                <small className="text-muted d-block mt-1">
                                                    يمكنك إنشاء الفئة مسبقا ثم ستظهر مباشرة في قائمة الفئات.
                                                </small>
                                            </>
                                        )}
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
                                            disabled={loading || creatingCategory}
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

