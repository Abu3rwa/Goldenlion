import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, addNewCategory, updateExistingCategory, removeCategory } from '../store/categoriesSlice';
import { userService } from '../services/userService';
import { MdAdd, MdEdit, MdDelete, MdCategory, MdClose, MdCheck } from 'react-icons/md';

const CategoriesPage = () => {
    const dispatch = useDispatch();
    const { categories, status, error } = useSelector((state) => state.categories);
    const { userProfile } = useSelector((state) => state.auth);

    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const canManage = userService.canPerformAction(userProfile?.roles || [], 'MANAGE_INVENTORY');

    useEffect(() => {
        dispatch(fetchCategories());
    }, [dispatch]);

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setDescription('');
    };

    const handleStartEdit = (cat) => {
        setEditingId(cat.id);
        setName(cat.name);
        setDescription(cat.description || '');
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            try {
                await dispatch(removeCategory(id)).unwrap();
            } catch (err) {
                alert('فشل الحذف: ' + err.message);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const catData = {
            name: name.trim(),
            description: description.trim()
        };

        try {
            if (editingId) {
                await dispatch(updateExistingCategory({ id: editingId, ...catData })).unwrap();
            } else {
                await dispatch(addNewCategory(catData)).unwrap();
            }
            resetForm();
        } catch (err) {
            console.error('Category save failed:', err);
            alert('حدث خطأ أثناء الحفظ: ' + (err.message || 'خطأ غير معروف'));
        }
    };


    // ...

    return (
        <div className="container-fluid px-2 px-md-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 mb-0 d-flex align-items-center gap-2">
                    <MdCategory className="text-gold" /> إدارة التصنيفات
                </h1>

            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* ... rest of the code */}
            <div className="row g-4 d-flex align-items-start">

                {/* Form Section */}
                {canManage && (
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px', zIndex: 1 }}>
                            <div className="card-header bg-white py-3">
                                <h5 className="h6 mb-0 fw-bold">{editingId ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">اسم التصنيف</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="مثلاً: ساعات ذكية"
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">الوصف (اختياري)</label>
                                        <textarea
                                            className="form-control"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows="2"
                                            placeholder="وصف مختصر للتصنيف..."
                                        ></textarea>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-gold flex-grow-1">
                                            {editingId ? <><MdCheck /> حفظ التعديلات</> : <><MdAdd /> إضافة</>}
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

                {/* List Section */}
                <div className={canManage ? "col-lg-8" : "col-12"}>
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            {categories.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <MdCategory className="fs-1 mb-3 opacity-25" />
                                    <p className="mb-3">لا توجد تصنيفات مضافة حتى الآن</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>الاسم</th>
                                                <th>الوصف</th>
                                                {canManage && <th className="text-end">إجراءات</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categories.map((cat) => (
                                                <tr key={cat.id}>
                                                    <td className="fw-bold">{cat.name}</td>
                                                    <td className="text-muted small">{cat.description || '-'}</td>
                                                    {canManage && (
                                                        <td className="text-end">
                                                            <div className="btn-group btn-group-sm">
                                                                <button
                                                                    className="btn btn-outline-primary border-0"
                                                                    onClick={() => handleStartEdit(cat)}
                                                                    title="تعديل"
                                                                >
                                                                    <MdEdit />
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger border-0"
                                                                    onClick={() => handleDelete(cat.id)}
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

export default CategoriesPage;
