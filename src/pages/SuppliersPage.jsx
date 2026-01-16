import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSuppliers, addNewSupplier, removeSupplier } from '../store/suppliersSlice';
import { MdDelete, MdAddBusiness } from 'react-icons/md';
import { userService } from '../services/userService';

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
    <div className="container-fluid px-0">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 mb-1">إدارة الموردين</h1>
          <p className="text-muted small">إضافة وإدارة قائمة الموردين المتعامل معهم</p>
        </div>
      </div>
      
      <div className="row g-4">
        {/* Add Supplier Form */}
        {canManage && (
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h3 className="h5 mb-4 d-flex align-items-center gap-2 border-bottom pb-2">
                  <MdAddBusiness className="text-gold" /> إضافة مورد جديد
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">اسم المورد</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="مثال: شركة النيل"
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">رقم الهاتف</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="09123..."
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-bold">العنوان</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="الخرطوم، السوق العربي"
                    />
                  </div>
                  <button type="submit" className="btn btn-gold w-100 py-2" disabled={!name}>
                    حفظ المورد
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Suppliers List */}
        <div className={`col-12 ${canManage ? 'col-lg-8' : ''}`}>
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h3 className="h5 mb-0">قائمة الموردين</h3>
                <span className="badge bg-gold text-dark">{suppliers.length} مورد</span>
              </div>
              
              {status === 'loading' && (
                <div className="text-center py-5">
                  <div className="spinner-border text-gold" role="status">
                    <span className="visually-hidden">جاري التحميل...</span>
                  </div>
                </div>
              )}
              
              {suppliers.length === 0 && status === 'succeeded' && (
                <div className="text-center py-5">
                  <p className="text-muted mb-0">لا يوجد موردين مسجلين.</p>
                </div>
              )}
              
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>اسم المورد</th>
                      <th>رقم الهاتف</th>
                      <th>العنوان</th>
                      {canManage && <th className="text-center">الإجراءات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(supplier => (
                      <tr key={supplier.id}>
                        <td className="fw-bold">{supplier.name}</td>
                        <td className="small">{supplier.phone || '-'}</td>
                        <td className="small">{supplier.address || '-'}</td>
                        {canManage && (
                          <td className="text-center">
                            <button 
                              onClick={() => handleDelete(supplier.id)} 
                              className="btn btn-outline-danger btn-sm border-0"
                            >
                              <MdDelete className="me-1" /> حذف
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
      </div>
    </div>
  );
};

export default SuppliersPage;
