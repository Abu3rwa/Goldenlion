import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllCities, addCity, updateCity, deleteCity, toggleCityActive, seedDefaultCities } from '../../../store/deliveryCitiesSlice';
import { formatCurrency } from '../../../utils/currency';
import { fromCents, toCents } from '../../../utils/decimalUtils';
import { userService } from '../../../services/userService';
import {
    MdLocationCity,
    MdAdd,
    MdEdit,
    MdDelete,
    MdCheck,
    MdClose,
    MdVisibility,
    MdVisibilityOff
} from 'react-icons/md';

const StoreCities = () => {
    const dispatch = useDispatch();
    const { cities, status } = useSelector((state) => state.deliveryCities);
    const { currency } = useSelector((state) => state.company);
    const { userProfile } = useSelector((state) => state.auth);

    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [region, setRegion] = useState('');
    const [deliveryCharge, setDeliveryCharge] = useState('');
    const [estimatedDays, setEstimatedDays] = useState('2-3');

    const canManage = userService.canPerformAction(userProfile?.role, 'MANAGE_DELIVERY_CITIES');

    useEffect(() => {
        dispatch(fetchAllCities());
    }, [dispatch]);

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setNameEn('');
        setRegion('');
        setDeliveryCharge('');
        setEstimatedDays('2-3');
    };

    const handleStartEdit = (city) => {
        setEditingId(city.id);
        setName(city.name);
        setNameEn(city.nameEn || '');
        setRegion(city.region || '');
        setDeliveryCharge(fromCents(city.deliveryCharge).toString());
        setEstimatedDays(city.estimatedDays || '2-3');
    };

    const handleDelete = async (id, cityName) => {
        if (window.confirm(`هل أنت متأكد من حذف "${cityName}"؟`)) {
            try {
                await dispatch(deleteCity(id)).unwrap();
            } catch (err) {
                alert('فشل الحذف: ' + err.message);
            }
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await dispatch(toggleCityActive({ id, isActive: !currentStatus })).unwrap();
        } catch (err) {
            alert('فشل تحديث الحالة: ' + err.message);
        }
    };

    const handleSeedDefaults = async () => {
        if (!window.confirm('هل تريد إضافة المدن الليبية الافتراضية؟')) return;
        try {
            await dispatch(seedDefaultCities()).unwrap();
            alert('تم إضافة المدن بنجاح');
        } catch (err) {
            alert('فشل إضافة المدن: ' + err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !deliveryCharge) return;

        const cityData = {
            name: name.trim(),
            nameEn: nameEn.trim(),
            region: region.trim(),
            deliveryCharge: toCents(parseFloat(deliveryCharge)),
            estimatedDays: estimatedDays.trim(),
            isActive: true
        };

        try {
            if (editingId) {
                await dispatch(updateCity({ id: editingId, cityData })).unwrap();
            } else {
                await dispatch(addCity(cityData)).unwrap();
            }
            resetForm();
        } catch (err) {
            alert('حدث خطأ: ' + err.message);
        }
    };

    if (status === 'loading') {
        return <div className="text-center py-5"><div className="spinner-border text-gold"></div></div>;
    }

    return (
        <div className="store-cities-page">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <h1 className="h3 mb-0 d-flex align-items-center gap-2">
                    <MdLocationCity className="text-gold" /> مدن التوصيل
                </h1>
                {canManage && cities.length === 0 && (
                    <button className="btn btn-outline-gold" onClick={handleSeedDefaults}>
                        إضافة المدن الافتراضية
                    </button>
                )}
            </div>

            <div className="row g-4">
                {/* Form */}
                {canManage && (
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                            <div className="card-header bg-white py-3">
                                <h5 className="h6 mb-0 fw-bold">
                                    {editingId ? 'تعديل مدينة' : 'إضافة مدينة جديدة'}
                                </h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">اسم المدينة (عربي) *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="مثال: طرابلس"
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">اسم المدينة (إنجليزي)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nameEn}
                                            onChange={(e) => setNameEn(e.target.value)}
                                            placeholder="Tripoli"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">المنطقة</label>
                                        <select
                                            className="form-select"
                                            value={region}
                                            onChange={(e) => setRegion(e.target.value)}
                                        >
                                            <option value="">-- اختر المنطقة --</option>
                                            <option value="غرب">غرب</option>
                                            <option value="شرق">شرق</option>
                                            <option value="جنوب">جنوب</option>
                                            <option value="وسط">وسط</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">رسوم التوصيل (د.ل) *</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={deliveryCharge}
                                            onChange={(e) => setDeliveryCharge(e.target.value)}
                                            min="0"
                                            step="0.5"
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label small text-muted">مدة التوصيل (أيام)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={estimatedDays}
                                            onChange={(e) => setEstimatedDays(e.target.value)}
                                            placeholder="مثال: 2-3"
                                        />
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-gold flex-grow-1">
                                            {editingId ? <><MdCheck /> حفظ</> : <><MdAdd /> إضافة</>}
                                        </button>
                                        {editingId && (
                                            <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                                                <MdClose /> إلغاء
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cities List */}
                <div className={canManage ? "col-lg-8" : "col-12"}>
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            {cities.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <MdLocationCity className="fs-1 mb-3 opacity-25" />
                                    <p className="mb-3">لا توجد مدن مضافة</p>
                                    {canManage && (
                                        <button className="btn btn-sm btn-gold" onClick={handleSeedDefaults}>
                                            إضافة المدن الليبية الافتراضية
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>المدينة</th>
                                                <th>المنطقة</th>
                                                <th>رسوم التوصيل</th>
                                                <th>المدة</th>
                                                <th>الحالة</th>
                                                {canManage && <th className="text-end">إجراءات</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cities.map((city) => (
                                                <tr key={city.id} className={!city.isActive ? 'text-muted' : ''}>
                                                    <td>
                                                        <div className="fw-bold">{city.name}</div>
                                                        {city.nameEn && <small className="text-muted">{city.nameEn}</small>}
                                                    </td>
                                                    <td>{city.region || '-'}</td>
                                                    <td className="fw-bold text-gold">
                                                        {formatCurrency(fromCents(city.deliveryCharge), currency)}
                                                    </td>
                                                    <td>{city.estimatedDays || '-'} يوم</td>
                                                    <td>
                                                        {city.isActive ? (
                                                            <span className="badge bg-success">مفعّلة</span>
                                                        ) : (
                                                            <span className="badge bg-secondary">معطّلة</span>
                                                        )}
                                                    </td>
                                                    {canManage && (
                                                        <td className="text-end">
                                                            <div className="btn-group btn-group-sm">
                                                                <button
                                                                    className={`btn ${city.isActive ? 'btn-outline-success' : 'btn-outline-secondary'} border-0`}
                                                                    onClick={() => handleToggleActive(city.id, city.isActive)}
                                                                    title={city.isActive ? 'تعطيل' : 'تفعيل'}
                                                                >
                                                                    {city.isActive ? <MdVisibility /> : <MdVisibilityOff />}
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-primary border-0"
                                                                    onClick={() => handleStartEdit(city)}
                                                                    title="تعديل"
                                                                >
                                                                    <MdEdit />
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger border-0"
                                                                    onClick={() => handleDelete(city.id, city.name)}
                                                                    title="حذف"
                                                                >
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
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreCities;
