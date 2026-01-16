/**
 * Invite Service - Manages email invitations with access codes
 */
import { db, auth } from './firebaseConfig';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { COLLECTIONS, USER_ROLES } from '../utils/constants';

const INVITES_COLLECTION = COLLECTIONS.INVITES;

export const inviteService = {
    /**
     * Create a new invite for an email
     * @param {string} email - Email to invite
     * @param {string} role - Role to assign when they register
     * @param {object} createdBy - User creating the invite
     * @returns {object} - The created invite with code
     */
    async createInvite(email, role, createdBy) {
        // SECURITY: Verify the caller is an owner
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('غير مصرح - يجب تسجيل الدخول');
        }

        const userRef = doc(db, COLLECTIONS.USERS, currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || userSnap.data().role !== USER_ROLES.OWNER) {
            throw new Error('غير مصرح - فقط المالك يمكنه إنشاء الدعوات');
        }

        // Generate a random 8-digit code (stronger than 6)
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Check if invite already exists for this email
        const existing = await this.getInviteByEmail(email);
        if (existing) {
            throw new Error('توجد دعوة مسبقة لهذا البريد الإلكتروني');
        }

        const inviteData = {
            email: email.toLowerCase().trim(),
            code,
            role: role || 'accountant',
            used: false,
            createdBy: {
                uid: createdBy.uid,
                email: createdBy.email
            },
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        };

        const docRef = await addDoc(collection(db, INVITES_COLLECTION), inviteData);

        return {
            id: docRef.id,
            ...inviteData,
            createdAt: new Date()
        };
    },

    /**
     * Get all invites
     */
    async getAllInvites() {
        const snapshot = await getDocs(collection(db, INVITES_COLLECTION));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Get invite by email
     */
    async getInviteByEmail(email) {
        const q = query(
            collection(db, INVITES_COLLECTION),
            where('email', '==', email.toLowerCase().trim())
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    },

    /**
     * Validate invite code for registration
     * @param {string} email - User's email
     * @param {string} code - Invite code
     * @returns {object|null} - The invite if valid, null otherwise
     */
    async validateInvite(email, code) {
        const invite = await this.getInviteByEmail(email);

        if (!invite) {
            return { valid: false, error: 'البريد الإلكتروني غير مدعو للتسجيل' };
        }

        if (invite.code !== code.toUpperCase().trim()) {
            return { valid: false, error: 'رمز الدعوة غير صحيح' };
        }

        if (invite.used) {
            return { valid: false, error: 'تم استخدام هذه الدعوة مسبقاً' };
        }

        // Check expiration
        if (invite.expiresAt) {
            const expiresAt = invite.expiresAt.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);
            if (new Date() > expiresAt) {
                return { valid: false, error: 'انتهت صلاحية رمز الدعوة' };
            }
        }

        return { valid: true, invite };
    },

    /**
     * Mark invite as used after successful registration
     */
    async markAsUsed(inviteId) {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, INVITES_COLLECTION, inviteId), {
            used: true,
            usedAt: serverTimestamp()
        });
    },

    /**
     * Delete an invite
     */
    async deleteInvite(inviteId) {
        await deleteDoc(doc(db, INVITES_COLLECTION, inviteId));
    }
};
