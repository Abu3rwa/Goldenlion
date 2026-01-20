import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { USER_ROLES } from '../utils/constants';
import { userService } from '../services/userService';
import PendingApprovalPage from '../pages/PendingApprovalPage';
import Loading from './Loading';

/**
 * PrivateRoute - Requires authentication
 * Staff users without proper role see a pending approval page
 */
const PrivateRoute = ({ children, requiresApprovedRole = true, requiredPermission = null }) => {
  const { user, userProfile, loading } = useSelector((state) => state.auth);

  // Still loading auth state - show loading
  if (loading) {
    return <Loading />;
  }

  // Get roles array from profile
  const roles = userProfile?.roles || [];

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is logged in but profile not loaded yet - show loading instead of redirecting
  if (user && !userProfile) {
    return <Loading />;
  }

  // If we require an approved role and user only has "staff" role - show pending page
  if (requiresApprovedRole && roles.length === 1 && roles[0] === USER_ROLES.STAFF) {
    return <PendingApprovalPage />;
  }

  // If we require a specific permission and user doesn't have it
  if (requiredPermission && !userService.canPerformAction(roles, requiredPermission)) {
    return <Navigate to="/" replace />; // Redirect to store if no permission
  }

  return children;
};

export default PrivateRoute;
