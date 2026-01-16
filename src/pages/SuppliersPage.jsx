import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSuppliers, addNewSupplier, removeSupplier } from '../store/suppliersSlice';
import { MdDelete, MdAddBusiness } from 'react-icons/md';
import { userService } from '../services/userService';
import './SuppliersPage.css';

const SuppliersPage = () => {
  const dispatch = useDispatch();
  const { suppliers, status, error } = useSelector((state) => state.suppliers);
  const { userProfile } = useSelector((state) => state.auth);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const canManage = userService.canPerformAction(userProfile?.role, 'MANAGE_INVENTORY');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSuppliers());
    }
  }, [status, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && canManage) {
      dispatch(addNewSupplier({ name, phone, address }));
      setName('');
      setPhone('');
      setAddress('');
    }
  };

  const handleDelete = (id) => {
    if (canManage && window.confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      dispatch(removeSupplier(id));
    }
  };

  return (
    <div className="suppliers-page">
      <h1>إدارة الموردين</h1>
      
      <div className="suppliers-layout">
        {/* Add Supplier Form */}
        {canManage && (
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
        )}

        {/* Suppliers List */}
        <div className="suppliers-list-container">
          <h3>قائمة الموردين</h3>
          {status === 'loading' && <p>جاري التحميل...</p>}
          {suppliers.length === 0 && status === 'succeeded' && <p>لا يوجد موردين مسجلين.</p>}
          
          <div className="table-responsive">
            <table className="app-table">
              <thead>
                <tr>
                  <th>اسم المورد</th>
                  <th>رقم الهاتف</th>
                  <th>العنوان</th>
                  {canManage && <th>الإجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td><strong>{supplier.name}</strong></td>
                    <td>{supplier.phone || '-'}</td>
                    <td>{supplier.address || '-'}</td>
                    {canManage && (
                      <td>
                        <button onClick={() => handleDelete(supplier.id)} className="delete-btn-icon">
                          <MdDelete /> حذف
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;
