import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts, removeProduct } from '../store/productsSlice';
import { fetchSuppliers } from '../store/suppliersSlice';
import { Link } from 'react-router-dom';
import { MdEdit, MdDelete } from 'react-icons/md';
import { formatCurrency } from '../utils/currency';
import { userService } from '../services/userService';

const ProductList = ({ currency }) => {
  const dispatch = useDispatch();
  const { products, status, error } = useSelector((state) => state.products);
  const { suppliers } = useSelector((state) => state.suppliers);
  const { userProfile } = useSelector((state) => state.auth);

  const canManageInventory = userService.canPerformAction(userProfile?.role, 'MANAGE_INVENTORY');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProducts());
    }
    dispatch(fetchSuppliers());
  }, [status, dispatch]);

  const getSupplierName = (id) => {
    const supplier = suppliers.find(s => s.id === id);
    return supplier ? supplier.name : 'غير محدد';
  };

  const handleDelete = (id) => {
      if(window.confirm('هل أنت متأكد أنك تريد حذف هذا المنتج؟')) {
          dispatch(removeProduct(id));
      }
  }

  const getStockStatus = (qty) => {
    if (qty === 0) return <span className="badge bg-danger-subtle text-danger border">نفد</span>;
    if (qty < 10) return <span className="badge bg-warning-subtle text-warning border">منخفض</span>;
    return <span className="badge bg-success-subtle text-success border">متوفر</span>;
  };

  let content;

  if (status === 'loading') {
    content = (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  } else if (status === 'failed') {
    content = <div className="alert alert-danger mx-3 my-4">خطأ: {error}</div>;
  } else if (products.length === 0) {
    content = (
      <div className="text-center py-5">
        <p className="text-muted">لم يتم العثور على منتجات. ابدأ بإضافة بعض المنتجات!</p>
      </div>
    );
  } else {
    content = (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>الاسم</th>
              <th>المورد</th>
              <th>الحالة</th>
              <th className="text-center">الكمية</th>
              <th>التكلفة</th>
              <th>البيع</th>
              {canManageInventory && <th className="text-center">الإجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="fw-bold">{product.name}</div>
                  <small className="text-muted d-block d-md-none">{getSupplierName(product.supplierId)}</small>
                </td>
                <td className="d-none d-md-table-cell">
                  <span className="small text-muted">{getSupplierName(product.supplierId)}</span>
                </td>
                <td>{getStockStatus(product.quantity)}</td>
                <td className="text-center fw-bold">{product.quantity}</td>
                <td className="text-muted small">{formatCurrency(product.costPrice, currency)}</td>
                <td className="fw-bold text-success">{formatCurrency(product.price, currency)}</td>
                {canManageInventory && (
                  <td className="text-center">
                    <div className="btn-group btn-group-sm">
                      <Link to={`/edit/${product.id}`} className="btn btn-outline-primary border-0">
                        <MdEdit />
                      </Link>
                      <button onClick={() => handleDelete(product.id)} className="btn btn-outline-danger border-0">
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
        <h2 className="h5 mb-0 fw-bold">قائمة المخزون</h2>
        <span className="badge bg-gold text-dark">{products.length} منتج</span>
      </div>
      <div className="card-body p-0">
        {content}
      </div>
    </div>
  );
};

export default ProductList;
