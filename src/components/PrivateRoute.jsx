import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { USER_ROLES } from '../utils/constants';
import { userService } from '../services/userService';
import PendingApprovalPage from '../pages/PendingApprovalPage';

/**
 * PrivateRoute - Requires authentication
 * Staff users without proper role see a pending approval page
 */
const PrivateRoute = ({ children, requiresApprovedRole = true, requiredPermission = null }) => {
  const { user, userProfile } = useSelector((state) => state.auth);

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If we require an approved role and user is just "staff" - show pending page
  if (requiresApprovedRole && userProfile?.role === USER_ROLES.STAFF) {
    return <PendingApprovalPage />;
  }

  // If we require a specific permission and user doesn't have it
  if (requiredPermission && !userService.canPerformAction(userProfile?.role, requiredPermission)) {
    return <Navigate to="/" replace />; // Redirect to dashboard if no permission
  }

  return children;
};

export default PrivateRoute;
