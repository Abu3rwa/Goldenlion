import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllUsers, updateUserRole, updateUserRoles } from '../store/authSlice';
import { userService } from '../services/userService';
import { inviteService } from '../services/inviteService';
import { USER_ROLES } from '../utils/constants';
import {
    MdSupervisorAccount,
    MdBlock,
    MdPersonAdd,
    MdContentCopy,
    MdDelete,
    MdCheck,
    MdPeople,
    MdMail
} from 'react-icons/md';
import './UsersPage.css';

const UsersPage = () => {
    const dispatch = useDispatch();
    const { allUsers, userProfile, user } = useSelector((state) => state.auth);

    const [activeTab, setActiveTab] = useState('users');
    const [invites, setInvites] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('accountant');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const roles = userProfile?.roles || [];
    const canManageUsers = userService.canPerformAction(roles, 'MANAGE_USERS');

    useEffect(() => {
        if (canManageUsers) {
            dispatch(fetchAllUsers());
            loadInvites();
        }
    }, [dispatch, canManageUsers]);

    const loadInvites = async () => {
        try {
            const data = await inviteService.getAllInvites();
            setInvites(data);
        } catch (error) {
            console.error('Error loading invites:', error);
        }
    };

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreateInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setLoading(true);
        try {
            await inviteService.createInvite(inviteEmail, inviteRole, user);
            await loadInvites();
            setInviteEmail('');
            showToast('success', 'تم إنشاء الدعوة بنجاح');
        } catch (error) {
            showToast('error', error.message || 'فشل إنشاء الدعوة');
        }
        setLoading(false);
    };

    const handleDeleteInvite = async (inviteId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه الدعوة؟')) return;

        try {
            await inviteService.deleteInvite(inviteId);
            await loadInvites();
            showToast('success', 'تم حذف الدعوة');
        } catch (error) {
            showToast('error', 'فشل حذف الدعوة');
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        showToast('success', 'تم نسخ الرمز');
    };

    const handleRoleChange = async (userId, newRoles) => {
        try {
            // Ensure it's an array
            const rolesArray = Array.isArray(newRoles) ? newRoles : [newRoles];
            await dispatch(updateUserRoles({ userId, newRoles: rolesArray })).unwrap();
            showToast('success', 'تم تحديث الأدوار بنجاح');
        } catch (error) {
            showToast('error', error || 'فشل تحديث الأدوار');
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case USER_ROLES.OWNER: return 'مالك';
            case USER_ROLES.ACCOUNTANT: return 'محاسب';
            case USER_ROLES.STAFF: return 'موظف';
            case USER_ROLES.SALES_MANAGER: return 'مدير مبيعات';
            default: return role;
        }
    };

    const getRoleLabels = (roles) => {
        if (!roles || !Array.isArray(roles)) return getRoleLabel(roles);
        return roles.map(r => getRoleLabel(r)).join('، ');
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ar-LY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const pendingInvites = invites.filter(i => !i.used);
    const usedInvites = invites.filter(i => i.used);

    if (!canManageUsers) {
        return (
            <div className="users-page">
                <h1><MdSupervisorAccount /> إدارة المستخدمين</h1>
                <div className="no-access-message">
                    <MdBlock />
                    <p>ليس لديك صلاحية للوصول لهذه الصفحة</p>
                    <p>هذه الصفحة متاحة للمالك فقط</p>
                </div>
            </div>
        );
    }

    return (
        <div className="users-page">
            <h1><MdSupervisorAccount /> إدارة المستخدمين والدعوات</h1>

            {/* Tabs */}
            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <MdPeople /> المستخدمين
                    <span className="tab-badge">{allUsers.length}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invites')}
                >
                    <MdMail /> الدعوات
                    <span className="tab-badge">{pendingInvites.length}</span>
                </button>
            </div>

            {/* Invites Tab */}
            {activeTab === 'invites' && (
                <div className="card-container">
                    {/* Invite Form */}
                    <div className="invite-form-section">
                        <h3><MdPersonAdd /> إرسال دعوة جديدة</h3>
                        <form className="invite-form" onSubmit={handleCreateInvite}>
                            <div className="form-field">
                                <label>البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>
                            <div className="form-field">
                                <label>الدور</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                >
                                    <option value="accountant">محاسب</option>
                                    <option value="sales_manager">مدير مبيعات</option>
                                    <option value="staff">موظف</option>
                                    <option value="owner">مالك</option>
                                </select>
                            </div>
                            <button type="submit" className="invite-btn" disabled={loading}>
                                <MdPersonAdd />
                                {loading ? 'جاري الإرسال...' : 'إنشاء دعوة'}
                            </button>
                        </form>
                    </div>

                    {/* Pending Invites Table */}
                    {pendingInvites.length > 0 && (
                        <div className="table-responsive">
                            <table className="app-table">
                                <thead>
                                    <tr>
                                        <th>البريد الإلكتروني</th>
                                        <th>الدور</th>
                                        <th>رمز الدعوة</th>
                                        <th>التاريخ</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingInvites.map(invite => (
                                        <tr key={invite.id}>
                                            <td><strong>{invite.email}</strong></td>
                                            <td>
                                                <span className={`badge ${invite.role === 'owner' ? 'gold' : 'success'}`}>
                                                    {getRoleLabel(invite.role)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="invite-code">{invite.code}</span>
                                            </td>
                                            <td className="text-light">{formatDate(invite.createdAt)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="edit-btn-icon"
                                                        onClick={() => handleCopyCode(invite.code)}
                                                        title="نسخ الرمز"
                                                    >
                                                        <MdContentCopy /> نسخ
                                                    </button>
                                                    <button
                                                        className="delete-btn-icon"
                                                        onClick={() => handleDeleteInvite(invite.id)}
                                                        title="حذف الدعوة"
                                                    >
                                                        <MdDelete /> حذف
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pendingInvites.length === 0 && (
                        <div className="empty-state">
                            <MdMail />
                            <p>لا توجد دعوات معلقة</p>
                        </div>
                    )}
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="table-responsive">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>المستخدم</th>
                                <th>الأدوار</th>
                                <th>الحالة</th>
                                <th>آخر دخول</th>
                                <th>تعديل الأدوار</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map((u) => {
                                const isCurrentUser = u.id === user?.uid;
                                const userRoles = (u.roles && u.roles.length > 0) ? u.roles : (u.role ? [u.role] : []);
                                const isOwner = userRoles.includes(USER_ROLES.OWNER);

                                const handleToggleRole = (role) => {
                                    if (isCurrentUser || isOwner) return;
                                    let newRoles;
                                    if (userRoles.includes(role)) {
                                        newRoles = userRoles.filter(r => r !== role);
                                        if (newRoles.length === 0) newRoles = [USER_ROLES.STAFF];
                                    } else {
                                        newRoles = [...userRoles, role];
                                    }
                                    handleRoleChange(u.id, newRoles);
                                };

                                return (
                                    <tr key={u.id} className={isCurrentUser ? 'current-user-row' : ''}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-small">
                                                    {(u.displayName || u.email)?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <strong>{u.displayName || u.email}</strong>
                                                    {isCurrentUser && <span className="you-badge">أنت</span>}
                                                    <br />
                                                    <small className="text-light">{u.email}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="roles-badges">
                                                {userRoles.map(role => (
                                                    <span
                                                        key={role}
                                                        className={`badge ${role === 'owner' ? 'gold' : role === 'accountant' ? 'success' : role === 'sales_manager' ? 'info' : 'pending'}`}
                                                    >
                                                        {getRoleLabel(role)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${u.isActive !== false ? 'active' : 'inactive'}`}>
                                                {u.isActive !== false ? 'نشط' : 'معلق'}
                                            </span>
                                        </td>
                                        <td className="text-light">{formatDate(u.lastLoginAt)}</td>
                                        <td>
                                            {isOwner ? (
                                                <span className="text-light">🔒 المالك</span>
                                            ) : isCurrentUser ? (
                                                <span className="text-light">-</span>
                                            ) : (
                                                <div className="roles-checkboxes-inline">
                                                    <label className="role-checkbox-inline">
                                                        <input type="checkbox" checked={userRoles.includes(USER_ROLES.ACCOUNTANT)} onChange={() => handleToggleRole(USER_ROLES.ACCOUNTANT)} />
                                                        <span>محاسب</span>
                                                    </label>
                                                    <label className="role-checkbox-inline">
                                                        <input type="checkbox" checked={userRoles.includes(USER_ROLES.SALES_MANAGER)} onChange={() => handleToggleRole(USER_ROLES.SALES_MANAGER)} />
                                                        <span>مبيعات</span>
                                                    </label>
                                                    <label className="role-checkbox-inline">
                                                        <input type="checkbox" checked={userRoles.includes(USER_ROLES.STAFF)} onChange={() => handleToggleRole(USER_ROLES.STAFF)} />
                                                        <span>موظف</span>
                                                    </label>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {allUsers.length === 0 && (
                        <div className="empty-state">
                            <MdPeople />
                            <p>لا يوجد مستخدمين مسجلين</p>
                        </div>
                    )}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.type === 'success' ? <MdCheck /> : <MdBlock />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default UsersPage;
