import { db, auth } from './firebaseConfig';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    getDocs,
    collection,
    serverTimestamp
} from 'firebase/firestore';
import { COLLECTIONS, USER_ROLES } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';

/**
 * User Service - Manages user profiles and roles
 * Uses ONLY roles array (not single role field)
 */
export const userService = {
    /**
     * Get user profile by UID
     */
    getUserProfile: async (uid) => {
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            return serializeFirestoreData({
                id: userSnap.id,
                ...data,
                roles: data.roles || [USER_ROLES.STAFF] // Default to staff if no roles
            });
        }
        return null;
    },

    /**
     * Create or update user profile on login/register
     * @param {object} user - Firebase user object
     * @param {string[]} assignedRoles - Roles from invite (optional)
     */
    ensureUserProfile: async (user, assignedRoles = null) => {
        const userRef = doc(db, COLLECTIONS.USERS, user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // First time user - create profile with assigned roles
            const roles = assignedRoles && assignedRoles.length > 0
                ? assignedRoles
                : [USER_ROLES.STAFF];

            const newUserProfile = {
                email: user.email,
                displayName: user.displayName || user.email,
                roles: roles,
                isActive: true,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
            };
            await setDoc(userRef, newUserProfile);

            return {
                id: user.uid,
                email: user.email,
                displayName: user.displayName || user.email,
                roles: roles
            };
        } else {
            // Update last login
            await updateDoc(userRef, {
                lastLoginAt: serverTimestamp()
            });
            const data = userSnap.data();
            return serializeFirestoreData({
                id: userSnap.id,
                ...data,
                roles: data.roles || [USER_ROLES.STAFF]
            });
        }
    },

    /**
     * Get all users (for owner to manage roles)
     */
    getAllUsers: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const users = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                roles: data.roles || [USER_ROLES.STAFF]
            };
        });
        return serializeFirestoreData(users);
    },

    /**
     * Update user roles (owner only)
     * @param {string} userId - User ID
     * @param {string[]} newRoles - Array of role strings
     */
    updateUserRoles: async (userId, newRoles) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('Not authenticated');
        }

        // Get current user's roles to verify they're owner
        const currentUserProfile = await userService.getUserProfile(currentUser.uid);
        if (!currentUserProfile?.roles?.includes(USER_ROLES.OWNER)) {
            throw new Error('Only owners can change user roles');
        }

        // Validate roles array
        if (!Array.isArray(newRoles) || newRoles.length === 0) {
            throw new Error('At least one role is required');
        }

        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            roles: newRoles,
            rolesUpdatedAt: serverTimestamp(),
            rolesUpdatedBy: {
                uid: currentUser.uid,
                email: currentUser.email
            }
        });

        return { id: userId, roles: newRoles };
    },

    /**
     * Check if user has permission for an action
     * @param {string[]} userRoles - Array of user roles
     * @param {string} action - The action to check permission for
     */
    canPerformAction: (userRoles, action) => {
        // Ensure it's an array
        const roles = Array.isArray(userRoles) ? userRoles : [];

        const permissions = {
            // Transactions (Stock IN/OUT)
            CREATE_TRANSACTION: [USER_ROLES.ACCOUNTANT],
            VIEW_TRANSACTIONS: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER, USER_ROLES.STAFF],

            // Comments
            ADD_COMMENT: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER],

            // User management
            MANAGE_USERS: [USER_ROLES.OWNER],

            // Products/Suppliers/Customers
            MANAGE_INVENTORY: [USER_ROLES.ACCOUNTANT],
            VIEW_INVENTORY: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER, USER_ROLES.STAFF],

            // Pages Access
            VIEW_ALL_PAGES: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER],

            // Costs visibility
            VIEW_COSTS: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER],

            // ===== PUBLIC STORE (Sales Manager + Owner only) =====
            MANAGE_PUBLIC_PRODUCTS: [USER_ROLES.SALES_MANAGER, USER_ROLES.OWNER],
            MANAGE_PUBLIC_ORDERS: [USER_ROLES.SALES_MANAGER, USER_ROLES.OWNER],
            MANAGE_DELIVERY_CITIES: [USER_ROLES.SALES_MANAGER, USER_ROLES.OWNER],
            VIEW_STORE_DASHBOARD: [USER_ROLES.SALES_MANAGER, USER_ROLES.OWNER],
            USE_POS: [USER_ROLES.SALES_MANAGER, USER_ROLES.OWNER],
            VIEW_ADVANCED_ANALYTICS: [USER_ROLES.OWNER],
        };

        const allowedRoles = permissions[action] || [];

        // Check if ANY of the user's roles has the required permission
        return roles.some(role => allowedRoles.includes(role));
    }
};
