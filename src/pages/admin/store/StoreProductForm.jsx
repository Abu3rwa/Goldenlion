import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { addPublicProduct, updatePublicProduct, fetchPublicProductById, clearCurrentProduct } from '../../../store/publicProductsSlice';
import { toCents, fromCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import { MdSave, MdArrowBack, MdAddPhotoAlternate, MdDelete } from 'react-icons/md';
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

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canManage = userService.canPerformAction(userProfile?.role, 'MANAGE_PUBLIC_PRODUCTS');

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
            images,
            inStock,
            featured,
            hasDelivery,
            sortOrder: parseInt(sortOrder) || 0
        };

        try {
            if (isEditing) {
                await dispatch(updatePublicProduct({ id, productData })).unwrap();
            } else {
                await dispatch(addPublicProduct({ productData, userId: userProfile?.id })).unwrap();
            }
            navigate('/admin/store/products');
        } catch (err) {
            setError(err.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
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
            <div className="d-flex align-items-center gap-3 mb-4">
                <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                    <MdArrowBack />
                </button>
                <h1 className="h3 mb-0">
                    {isEditing ? 'تعديل منتج' : 'إضافة منتج جديد'}
                </h1>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    {/* Main Info */}
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0 fw-bold">معلومات المنتج</h5>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label">كود المنتج</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="مثال: BAG-001"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">اسم المنتج (عربي) *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="مثال: شنطة كتف أنيقة"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">اسم المنتج (إنجليزي)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nameEn}
                                            onChange={(e) => setNameEn(e.target.value)}
                                            placeholder="Elegant Shoulder Bag"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">الوصف</label>
                                        <textarea
                                            className="form-control"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows="3"
                                            placeholder="وصف تفصيلي للمنتج..."
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">السعر (د.ل) *</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">ترتيب العرض</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={sortOrder}
                                            onChange={(e) => setSortOrder(e.target.value)}
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Images */}
                        <div className="card border-0 shadow-sm mt-4">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0 fw-bold">صور المنتج</h5>
                            </div>
                            <div className="card-body">
                                <div className="input-group mb-3">
                                    <input
                                        type="url"
                                        className="form-control"
                                        value={newImageUrl}
                                        onChange={(e) => setNewImageUrl(e.target.value)}
                                        placeholder="رابط الصورة (https://...)"
                                        dir="ltr"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-gold"
                                        onClick={handleAddImage}
                                    >
                                        <MdAddPhotoAlternate /> إضافة
                                    </button>
                                </div>

                                {images.length > 0 && (
                                    <div className="row g-2">
                                        {images.map((img, index) => (
                                            <div key={index} className="col-4 col-md-3">
                                                <div className="image-preview-item">
                                                    <img src={img} alt={`صورة ${index + 1}`} />
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger remove-btn"
                                                        onClick={() => handleRemoveImage(index)}
                                                    >
                                                        <MdDelete />
                                                    </button>
                                                    {index === 0 && (
                                                        <span className="main-badge">رئيسية</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0 fw-bold">الإعدادات</h5>
                            </div>
                            <div className="card-body">
                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="inStock"
                                        checked={inStock}
                                        onChange={(e) => setInStock(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="inStock">
                                        متوفر في المخزون
                                    </label>
                                </div>
                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="featured"
                                        checked={featured}
                                        onChange={(e) => setFeatured(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="featured">
                                        منتج مميز (يظهر في الصفحة الرئيسية)
                                    </label>
                                </div>
                                <div className="form-check form-switch mb-4">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="hasDelivery"
                                        checked={hasDelivery}
                                        onChange={(e) => setHasDelivery(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="hasDelivery">
                                        يمكن توصيله
                                    </label>
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
            </form>
        </div>
    );
};

export default StoreProductForm;
