import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchPublicProducts, deletePublicProduct, toggleProductStock, toggleProductFeatured } from '../../../store/publicProductsSlice';
import { formatCurrency } from '../../../utils/currency';
import { fromCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import {
    MdAdd,
    MdEdit,
    MdDelete,
    MdInventory,
    MdStar,
    MdStarBorder,
    MdVisibility,
    MdVisibilityOff,
    MdImage
} from 'react-icons/md';
import './StoreProducts.css';

const StoreProducts = () => {
    const dispatch = useDispatch();
    const { products, status } = useSelector((state) => state.publicProducts);
    const { currency } = useSelector((state) => state.company);
    const { userProfile } = useSelector((state) => state.auth);

    const [filter, setFilter] = useState('all'); // all, inStock, outOfStock, featured

    // Get roles array from profile
    const roles = userProfile?.roles || [];
    const canManage = userService.canPerformAction(roles, 'MANAGE_PUBLIC_PRODUCTS');

    useEffect(() => {
        dispatch(fetchPublicProducts());
    }, [dispatch]);

    const handleDelete = async (id, name) => {
        if (window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) {
            try {
                await dispatch(deletePublicProduct(id)).unwrap();
            } catch (err) {
                alert('فشل الحذف: ' + err.message);
            }
        }
    };

    const handleToggleStock = async (id, currentStatus) => {
        try {
            await dispatch(toggleProductStock({ id, inStock: !currentStatus })).unwrap();
        } catch (err) {
            alert('فشل تحديث الحالة: ' + err.message);
        }
    };

    const handleToggleFeatured = async (id, currentStatus) => {
        try {
            await dispatch(toggleProductFeatured({ id, featured: !currentStatus })).unwrap();
        } catch (err) {
            alert('فشل تحديث الحالة: ' + err.message);
        }
    };

    const filteredProducts = products.filter(p => {
        if (filter === 'inStock') return p.inStock;
        if (filter === 'outOfStock') return !p.inStock;
        if (filter === 'featured') return p.featured;
        return true;
    });

    if (status === 'loading') {
        return <div className="text-center py-5"><div className="spinner-border text-gold"></div></div>;
    }

    return (
        <div className="store-products-page">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <h1 className="h3 mb-0 d-flex align-items-center gap-2">
                    <MdInventory className="text-gold" /> منتجات المتجر
                </h1>
                {canManage && (
                    <Link to="/admin/store/products/new" className="btn btn-gold">
                        <MdAdd className="me-1" /> إضافة منتج
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
                <button
                    className={`btn btn-sm ${filter === 'all' ? 'btn-gold' : 'btn-outline-secondary'}`}
                    onClick={() => setFilter('all')}
                >
                    الكل ({products.length})
                </button>
                <button
                    className={`btn btn-sm ${filter === 'inStock' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setFilter('inStock')}
                >
                    متوفر ({products.filter(p => p.inStock).length})
                </button>
                <button
                    className={`btn btn-sm ${filter === 'outOfStock' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setFilter('outOfStock')}
                >
                    غير متوفر ({products.filter(p => !p.inStock).length})
                </button>
                <button
                    className={`btn btn-sm ${filter === 'featured' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setFilter('featured')}
                >
                    <MdStar /> مميز ({products.filter(p => p.featured).length})
                </button>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5 text-muted">
                        <MdInventory className="fs-1 mb-3 opacity-25" />
                        <p className="mb-3">لا توجد منتجات</p>
                        {canManage && (
                            <Link to="/admin/store/products/new" className="btn btn-gold">
                                <MdAdd /> أضف أول منتج
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="row g-3">
                    {filteredProducts.map((product) => (
                        <div key={product.id} className="col-6 col-md-4 col-lg-3">
                            <div className={`card h-100 border-0 shadow-sm product-card ${!product.inStock ? 'out-of-stock' : ''}`}>
                                {/* Product Image */}
                                <div className="product-image-wrapper">
                                    {product.images?.[0] ? (
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="product-image"
                                        />
                                    ) : (
                                        <div className="product-image-placeholder">
                                            <MdImage className="fs-1 text-muted" />
                                        </div>
                                    )}
                                    {/* Badges */}
                                    <div className="product-badges">
                                        {product.featured && (
                                            <span className="badge bg-warning"><MdStar /></span>
                                        )}
                                        {!product.inStock && (
                                            <span className="badge bg-danger">غير متوفر</span>
                                        )}
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="card-body p-2">
                                    <h6 className="mb-1 product-name">{product.name}</h6>
                                    <div className="fw-bold text-gold">
                                        {formatCurrency(fromCents(product.price), currency)}
                                    </div>
                                </div>

                                {/* Actions */}
                                {canManage && (
                                    <div className="card-footer bg-white border-0 p-2 pt-0">
                                        <div className="d-flex gap-1">
                                            <button
                                                className={`btn btn-sm flex-grow-1 ${product.inStock ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                                                onClick={() => handleToggleStock(product.id, product.inStock)}
                                                title={product.inStock ? 'إخفاء' : 'إظهار'}
                                            >
                                                {product.inStock ? <MdVisibility /> : <MdVisibilityOff />}
                                            </button>
                                            <button
                                                className={`btn btn-sm flex-grow-1 ${product.featured ? 'btn-warning' : 'btn-outline-warning'}`}
                                                onClick={() => handleToggleFeatured(product.id, product.featured)}
                                                title={product.featured ? 'إزالة من المميز' : 'تمييز'}
                                            >
                                                {product.featured ? <MdStar /> : <MdStarBorder />}
                                            </button>
                                            <Link
                                                to={`/admin/store/products/${product.id}/edit`}
                                                className="btn btn-sm btn-outline-primary flex-grow-1"
                                                title="تعديل"
                                            >
                                                <MdEdit />
                                            </Link>
                                            <button
                                                className="btn btn-sm btn-outline-danger flex-grow-1"
                                                onClick={() => handleDelete(product.id, product.name)}
                                                title="حذف"
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StoreProducts;
