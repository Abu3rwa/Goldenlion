import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { MdHourglassTop, MdLogout, MdAccessTime } from 'react-icons/md';
import './PendingApprovalPage.css';

const PendingApprovalPage = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <div className="pending-approval-page">
            <div className="pending-card">
                <MdHourglassTop className="pending-icon" />

                <h1>في انتظار الموافقة</h1>

                <p>
                    تم تسجيل حسابك بنجاح ولكنك تحتاج إلى موافقة المالك
                    للوصول إلى النظام.
                </p>

                <div className="user-email">
                    {user?.email}
                </div>

                <div className="status-badge">
                    <MdAccessTime />
                    قيد المراجعة
                </div>

                <div className="contact-info">
                    يرجى التواصل مع مالك النظام لتفعيل حسابك ومنحك الصلاحيات المناسبة.
                </div>

                <div className="logout-link" onClick={handleLogout}>
                    <MdLogout />
                    تسجيل خروج
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
