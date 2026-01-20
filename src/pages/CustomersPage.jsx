import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomers, addNewCustomer, removeCustomer } from '../store/customersSlice';
import { MdDelete, MdStorefront } from 'react-icons/md';
import { userService } from '../services/userService';

const CustomersPage = () => {
    const dispatch = useDispatch();
    const { customers, status } = useSelector((state) => state.customers);
    const { userProfile } = useSelector((state) => state.auth);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    const canManage = userService.canPerformAction(userProfile?.roles || [], 'MANAGE_INVENTORY');

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchCustomers());
        }
    }, [status, dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name && canManage) {
            dispatch(addNewCustomer({ name, phone, address, notes }));
            setName('');
            setPhone('');
            setAddress('');
            setNotes('');
        }
    };

    const handleDelete = (id) => {
        if (canManage && window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
            dispatch(removeCustomer(id));
        }
    };

    return (
        <div className="container-fluid px-0">
            <div className="row mb-4">
                <div className="col-12">
                    <h1 className="h3 mb-1"><MdStorefront className="ms-1" /> إدارة العملاء (الفروع)</h1>
                    <p className="text-muted small">إضافة وإدارة فروع استلام البضائع</p>
                </div>
            </div>

            <div className="row g-4">
                {/* Add Customer Form */}
                {canManage && (
                    <div className="col-12 col-lg-4">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <h3 className="h5 mb-4 d-flex align-items-center gap-2 border-bottom pb-2">
                                    <MdStorefront className="text-gold" /> إضافة فرع جديد
                                </h3>
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">اسم الفرع</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="مثال: فرع الخرطوم"
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
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">العنوان</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="الخرطوم، السوق العربي"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label small fw-bold">ملاحظات</label>
                                        <textarea
                                            className="form-control"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="أي ملاحظات إضافية..."
                                            rows={3}
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-gold w-100 py-2" disabled={!name}>
                                        حفظ الفرع
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customers List */}
                <div className={`col-12 ${canManage ? 'col-lg-8' : ''}`}>
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                <h3 className="h5 mb-0">قائمة الفروع</h3>
                                <span className="badge bg-gold text-dark">{customers.length} فرع</span>
                            </div>

                            {status === 'loading' && (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-gold" role="status">
                                        <span className="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </div>
                            )}

                            {customers.length === 0 && status === 'succeeded' && (
                                <div className="text-center py-5">
                                    <p className="text-muted mb-0">لا يوجد فروع مسجلة.</p>
                                </div>
                            )}

                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>اسم الفرع</th>
                                            <th>رقم الهاتف</th>
                                            <th>العنوان</th>
                                            <th>ملاحظات</th>
                                            {canManage && <th className="text-center">الإجراءات</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customers.filter(c => c.isActive !== false).map(customer => (
                                            <tr key={customer.id}>
                                                <td className="fw-bold">{customer.name}</td>
                                                <td className="small">{customer.phone || '-'}</td>
                                                <td className="small">{customer.address || '-'}</td>
                                                <td className="small text-muted">{customer.notes || '-'}</td>
                                                {canManage && (
                                                    <td className="text-center">
                                                        <button
                                                            onClick={() => handleDelete(customer.id)}
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

export default CustomersPage;
