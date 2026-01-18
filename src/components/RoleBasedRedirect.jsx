import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { USER_ROLES } from '../utils/constants';

/**
 * Component that redirects authenticated users to their role-based dashboard
 * - sales_manager → /admin/store
 * - owner, accountant → /dashboard
 * - staff → /transactions
 */
const RoleBasedRedirect = () => {
    const { user, userProfile } = useSelector((state) => state.auth);

    // If not logged in, stay on landing page (handled by parent)
    if (!user) {
        return null;
    }

    // Redirect based on role
    const role = userProfile?.role;

    switch (role) {
        case USER_ROLES.SALES_MANAGER:
        case USER_ROLES.OWNER:
            return <Navigate to="/admin/store" replace />;
        case USER_ROLES.OWNER:
        case USER_ROLES.ACCOUNTANT:
            return <Navigate to="/dashboard" replace />;
        case USER_ROLES.STAFF:
            return <Navigate to="/transactions" replace />;
        default:
            // Default to dashboard for unknown roles
            return <Navigate to="/" replace />;
    }
};

export default RoleBasedRedirect;
