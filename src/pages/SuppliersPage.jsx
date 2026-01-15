import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSuppliers, addNewSupplier, removeSupplier } from '../store/suppliersSlice';
import { MdDelete, MdAddBusiness } from 'react-icons/md';
import './SuppliersPage.css';

const SuppliersPage = () => {
  const dispatch = useDispatch();
  const { suppliers, status, error } = useSelector((state) => state.suppliers);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSuppliers());
    }
  }, [status, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name) {
      dispatch(addNewSupplier({ name, phone, address }));
      setName('');
      setPhone('');
      setAddress('');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      dispatch(removeSupplier(id));
    }
  };

  return (
    <div className="suppliers-page">
      <h1>إدارة الموردين</h1>
      
      <div className="suppliers-layout">
        {/* Add Supplier Form */}
        <div className="add-supplier-card">
          <h3><MdAddBusiness /> إضافة مورد جديد</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>اسم المورد</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="مثال: شركة النيل"
                required 
              />
            </div>
            <div className="form-group">
              <label>رقم الهاتف</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="09123..."
              />
            </div>
            <div className="form-group">
              <label>العنوان</label>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="الخرطوم، السوق العربي"
              />
            </div>
            <button type="submit" className="save-btn" disabled={!name}>حفظ المورد</button>
          </form>
        </div>

        {/* Suppliers List */}
        <div className="suppliers-list-container">
          <h3>قائمة الموردين</h3>
          {status === 'loading' && <p>جاري التحميل...</p>}
          {suppliers.length === 0 && status === 'succeeded' && <p>لا يوجد موردين مسجلين.</p>}
          
          <ul className="suppliers-list">
            {suppliers.map(supplier => (
              <li key={supplier.id} className="supplier-item">
                <div className="supplier-info">
                  <strong>{supplier.name}</strong>
                  <span className="supplier-details">{supplier.phone} - {supplier.address}</span>
                </div>
                <button onClick={() => handleDelete(supplier.id)} className="delete-btn-icon">
                  <MdDelete />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;
