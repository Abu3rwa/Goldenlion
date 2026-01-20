import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { USER_ROLES } from '../utils/constants';

/**
 * Component that redirects authenticated users to their role-based dashboard
 * Priority order (if user has multiple roles):
 * 1. owner → /dashboard (has access to everything)
 * 2. accountant → /dashboard (inventory management)
 * 3. sales_manager → /admin/store (store management)
 * 4. staff → /transactions (basic access)
 */
const RoleBasedRedirect = () => {
    const { user, userProfile } = useSelector((state) => state.auth);

    // If not logged in, stay on landing page (handled by parent)
    if (!user) {
        return null;
    }

    // Get roles array from profile
    const roles = userProfile?.roles || [];

    // Determine redirect based on highest priority role
    if (roles.includes(USER_ROLES.OWNER)) {
        return <Navigate to="/dashboard" replace />;
    }
    if (roles.includes(USER_ROLES.ACCOUNTANT)) {
        return <Navigate to="/dashboard" replace />;
    }
    if (roles.includes(USER_ROLES.SALES_MANAGER)) {
        return <Navigate to="/admin/store" replace />;
    }
    if (roles.includes(USER_ROLES.STAFF)) {
        return <Navigate to="/transactions" replace />;
    }

    // Default for unknown roles or empty roles
    return <Navigate to="/store" replace />;
};

export default RoleBasedRedirect;

