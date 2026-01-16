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
 */
export const userService = {
    /**
     * Get user profile by UID
     */
    getUserProfile: async (uid) => {
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return serializeFirestoreData({ id: userSnap.id, ...userSnap.data() });
        }
        return null;
    },

    /**
     * Create or update user profile on login/register
     * @param {object} user - Firebase user object
     * @param {string} assignedRole - Role from invite (optional, defaults to STAFF)
     */
    ensureUserProfile: async (user, assignedRole = null) => {
        const userRef = doc(db, COLLECTIONS.USERS, user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // First time user - create profile with assigned role from invite or default
            const role = assignedRole || USER_ROLES.STAFF;
            const newUserProfile = {
                email: user.email,
                displayName: user.displayName || user.email,
                role: role,
                isActive: true,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
            };
            await setDoc(userRef, newUserProfile);
            // We return the raw object here because serverTimestamp hasn't resolved to a date yet in the local object,
            // but we want to return something serializable or at least consistent.
            // Ideally we'd fetch it back, but optimization: just return what we know.
            // serverTimestamp() is NOT serializable, so we can't return it directly to Redux if we constructed it here.
            // We should strip timestamps or use current date for local state.
            return {
                id: user.uid,
                email: user.email,
                displayName: user.displayName || user.email,
                role: role
            };
        } else {
            // Update last login
            await updateDoc(userRef, {
                lastLoginAt: serverTimestamp()
            });
            return serializeFirestoreData({ id: userSnap.id, ...userSnap.data() });
        }
    },

    /**
     * Get all users (for owner to manage roles)
     */
    getAllUsers: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const users = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(users);
    },

    /**
     * Update user role (owner only)
     */
    updateUserRole: async (userId, newRole) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('Not authenticated');
        }

        // Get current user's role to verify they're owner
        const currentUserProfile = await userService.getUserProfile(currentUser.uid);
        if (currentUserProfile?.role !== USER_ROLES.OWNER) {
            throw new Error('Only owners can change user roles');
        }

        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            role: newRole,
            roleUpdatedAt: serverTimestamp(),
            roleUpdatedBy: {
                uid: currentUser.uid,
                email: currentUser.email
            }
        });

        return { id: userId, role: newRole };
    },

    /**
     * Check if user has permission for an action
     */
    canPerformAction: (userRole, action) => {
        const permissions = {
            // Transactions (Stock IN/OUT) - Owner is OBSERVER ONLY
            CREATE_TRANSACTION: [USER_ROLES.ACCOUNTANT],
            VIEW_TRANSACTIONS: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER, USER_ROLES.STAFF],

            // Comments
            ADD_COMMENT: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER],

            // User management
            MANAGE_USERS: [USER_ROLES.OWNER],

            // Products/Suppliers/Customers - Owner is OBSERVER ONLY
            MANAGE_INVENTORY: [USER_ROLES.ACCOUNTANT],
            VIEW_INVENTORY: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER, USER_ROLES.STAFF],

            // Pages Access
            VIEW_ALL_PAGES: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER],

            // Costs visibility
            VIEW_COSTS: [USER_ROLES.ACCOUNTANT, USER_ROLES.OWNER],
        };

        return permissions[action]?.includes(userRole) || false;
    }
};
