import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts, removeProduct } from '../store/productsSlice';
import { fetchSuppliers } from '../store/suppliersSlice';
import { Link } from 'react-router-dom';
import { MdEdit, MdDelete } from 'react-icons/md';
import './ProductList.css';

const ProductList = () => {
  const dispatch = useDispatch();
  const { products, status, error } = useSelector((state) => state.products);
  const { suppliers } = useSelector((state) => state.suppliers);

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
    if (qty === 0) return <span className="stock-badge stock-out">نفد من المخزون</span>;
    if (qty < 10) return <span className="stock-badge stock-low">كمية منخفضة</span>;
    return <span className="stock-badge stock-in">متوفر</span>;
  };

  let content;

  if (status === 'loading') {
    content = <div style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل المخزون...</div>;
  } else if (status === 'failed') {
    content = <div style={{ color: 'var(--danger)', padding: '2rem' }}>خطأ: {error}</div>;
  } else if (products.length === 0) {
    content = <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>لم يتم العثور على منتجات. ابدأ بإضافة بعض المنتجات!</div>;
  } else {
    content = (
      <table className="product-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>المورد</th>
            <th>الحالة</th>
            <th>الكمية</th>
            <th>التكلفة</th>
            <th>البيع</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td><strong>{product.name}</strong></td>
              <td><span className="supplier-tag">{getSupplierName(product.supplierId)}</span></td>
              <td>{getStockStatus(product.quantity)}</td>
              <td>{product.quantity}</td>
              <td className="cost-val">${product.costPrice?.toFixed(2) || '0.00'}</td>
              <td className="price-val">${product.price.toFixed(2)}</td>
              <td>
                  <Link to={`/edit/${product.id}`} className="action-btn edit-btn">
                    <MdEdit /> تعديل
                  </Link>
                  <button onClick={() => handleDelete(product.id)} className="action-btn delete-btn">
                    <MdDelete /> حذف
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="product-list">
      <h2>قائمة المخزون</h2>
      {content}
    </div>
  );
};

export default ProductList;
