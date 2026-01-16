import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomers, addNewCustomer, removeCustomer } from '../store/customersSlice';
import { MdDelete, MdStorefront } from 'react-icons/md';
import { userService } from '../services/userService';
import './CustomersPage.css';

const CustomersPage = () => {
    const dispatch = useDispatch();
    const { customers, status } = useSelector((state) => state.customers);
    const { userProfile } = useSelector((state) => state.auth);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    const canManage = userService.canPerformAction(userProfile?.role, 'MANAGE_INVENTORY');

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
        <div className="customers-page">
            <h1><MdStorefront /> إدارة العملاء (الفروع)</h1>

            <div className="customers-layout">
                {/* Add Customer Form - Only for accountant/owner */}
                {canManage && (
                    <div className="add-customer-card">
                        <h3><MdStorefront /> إضافة فرع جديد</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>اسم الفرع</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="مثال: فرع الخرطوم"
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
                            <div className="form-group">
                                <label>ملاحظات</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="أي ملاحظات إضافية..."
                                    rows={3}
                                />
                            </div>
                            <button type="submit" className="save-btn" disabled={!name}>حفظ الفرع</button>
                        </form>
                    </div>
                )}

                {/* Customers List */}
                <div className="customers-list-container">
                    <h3>قائمة الفروع</h3>
                    {status === 'loading' && <p>جاري التحميل...</p>}
                    {customers.length === 0 && status === 'succeeded' && <p>لا يوجد فروع مسجلة.</p>}

                    <div className="table-responsive">
                        <table className="app-table">
                            <thead>
                                <tr>
                                    <th>اسم الفرع</th>
                                    <th>رقم الهاتف</th>
                                    <th>العنوان</th>
                                    <th>ملاحظات</th>
                                    {canManage && <th>الإجراءات</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {customers.filter(c => c.isActive !== false).map(customer => (
                                    <tr key={customer.id}>
                                        <td><strong>{customer.name}</strong></td>
                                        <td>{customer.phone || '-'}</td>
                                        <td>{customer.address || '-'}</td>
                                        <td>{customer.notes || '-'}</td>
                                        {canManage && (
                                            <td>
                                                <button onClick={() => handleDelete(customer.id)} className="delete-btn-icon">
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

export default CustomersPage;
