import { db, auth } from './firebaseConfig';
import {
    collection,
    doc,
    runTransaction,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { COLLECTIONS, TRANSACTION_TYPES, USER_ROLES } from '../utils/constants';
import { toCents, calculateLineTotal, addCents } from '../utils/decimalUtils';
import { serializeFirestoreData } from '../utils/serialization';
import { generateShortId } from '../utils/idGenerator';

/**
 * Verify user is an accountant before allowing transaction creation
 */
const verifyAccountantRole = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('غير مصرح - يجب تسجيل الدخول');
    }

    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role !== USER_ROLES.ACCOUNTANT) {
        throw new Error('غير مصرح - فقط المحاسب يمكنه تسجيل المعاملات');
    }

    return user;
};

/**
 * Transaction Service - Atomic stock operations
 * Uses Firestore transactions to ensure data consistency
 */
export const transactionService = {
    /**
     * Record Stock IN (from supplier) - ATOMIC
     * @param {Object} data - { supplierId, supplierName, items: [{productId, productName, quantity, costPrice}], notes }
     */
    recordStockIn: async (data) => {
        // SECURITY: Verify caller is accountant
        const user = await verifyAccountantRole();

        const { supplierId, supplierName, items, notes } = data;
        const displayId = generateShortId();

        // Prepare items with cents
        const preparedItems = items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCostCents: toCents(item.costPrice),
            unitPriceCents: toCents(item.sellingPrice || 0),
            lineTotalCents: calculateLineTotal(item.quantity, toCents(item.costPrice))
        }));

        const totalCostCents = addCents(...preparedItems.map(i => i.lineTotalCents));

        // Run atomic transaction
        const transactionId = await runTransaction(db, async (transaction) => {
            // Update all product quantities
            for (const item of items) {
                const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
                const productSnap = await transaction.get(productRef);

                if (!productSnap.exists()) {
                    throw new Error(`Product ${item.productName} not found`);
                }

                const currentQty = productSnap.data().quantity || 0;
                transaction.update(productRef, {
                    quantity: currentQty + item.quantity,
                    lastRestockAt: serverTimestamp()
                });
            }

            // Create transaction record
            const txRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
            const txData = {
                type: TRANSACTION_TYPES.STOCK_IN,
                displayId,
                supplierId,
                supplierName,
                customerId: null,
                customerName: null,
                items: preparedItems,
                totalCostCents,
                totalPriceCents: 0,
                notes: notes || '',
                comments: [],
                createdBy: {
                    uid: user?.uid || 'system',
                    email: user?.email || 'system'
                },
                createdAt: serverTimestamp()
            };
            transaction.set(txRef, txData);

            // COMPLIANCE (Requirement 2.4): Log to audit trail
            const auditRef = doc(collection(db, 'audit_logs'));
            transaction.set(auditRef, {
                action: 'STOCK_IN',
                entityId: txRef.id,
                entityName: supplierName,
                details: {
                    displayId,
                    itemCount: items.length,
                    totalValue: totalCostCents / 100,
                    notes: notes || ''
                },
                userId: user?.uid || 'system',
                userEmail: user?.email || 'system',
                timestamp: serverTimestamp()
            });

            return txRef.id;
        });

        return { id: transactionId, type: TRANSACTION_TYPES.STOCK_IN, displayId };
    },

    /**
     * Record Stock OUT (to customer/shop) - ATOMIC
     * @param {Object} data - { customerId, customerName, items: [{productId, productName, quantity, sellingPrice}], notes }
     */
    recordStockOut: async (data) => {
        // SECURITY: Verify caller is accountant
        const user = await verifyAccountantRole();

        const { customerId, customerName, items, notes } = data;
        const displayId = generateShortId();

        // Prepare items with cents
        const preparedItems = items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCostCents: toCents(item.costPrice || 0),
            unitPriceCents: toCents(item.sellingPrice),
            lineTotalCents: calculateLineTotal(item.quantity, toCents(item.sellingPrice))
        }));

        const totalPriceCents = addCents(...preparedItems.map(i => i.lineTotalCents));
        const totalCostCents = addCents(...preparedItems.map(i =>
            calculateLineTotal(i.quantity, i.unitCostCents)
        ));

        // Run atomic transaction
        const transactionId = await runTransaction(db, async (transaction) => {
            // Validate and update all product quantities
            for (const item of items) {
                const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
                const productSnap = await transaction.get(productRef);

                if (!productSnap.exists()) {
                    throw new Error(`Product ${item.productName} not found`);
                }

                const currentQty = productSnap.data().quantity || 0;

                // Prevent negative stock
                if (currentQty < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.productName}. Available: ${currentQty}`);
                }

                transaction.update(productRef, {
                    quantity: currentQty - item.quantity,
                    lastSaleAt: serverTimestamp()
                });
            }

            // Create transaction record
            const txRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
            const txData = {
                type: TRANSACTION_TYPES.STOCK_OUT,
                displayId,
                supplierId: null,
                supplierName: null,
                customerId,
                customerName,
                items: preparedItems,
                totalCostCents,
                totalPriceCents,
                notes: notes || '',
                comments: [],
                createdBy: {
                    uid: user?.uid || 'system',
                    email: user?.email || 'system'
                },
                createdAt: serverTimestamp()
            };
            transaction.set(txRef, txData);

            // COMPLIANCE (Requirement 2.4): Log to audit trail
            const auditRef = doc(collection(db, 'audit_logs'));
            transaction.set(auditRef, {
                action: 'STOCK_OUT',
                entityId: txRef.id,
                entityName: customerName,
                details: {
                    displayId,
                    itemCount: items.length,
                    totalValue: totalPriceCents / 100,
                    notes: notes || ''
                },
                userId: user?.uid || 'system',
                userEmail: user?.email || 'system',
                timestamp: serverTimestamp()
            });

            return txRef.id;
        });

        return { id: transactionId, type: TRANSACTION_TYPES.STOCK_OUT, displayId };
    },

    /**
     * Get all transactions with optional filters
     */
    getTransactions: async (filters = {}) => {
        let q = query(
            collection(db, COLLECTIONS.TRANSACTIONS),
            orderBy('createdAt', 'desc')
        );

        if (filters.type) {
            q = query(q, where('type', '==', filters.type));
        }

        const querySnapshot = await getDocs(q);
        const transactions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(transactions);
    },

    /**
     * Add comment to transaction
     */
    addComment: async (transactionId, commentText) => {
        const user = auth.currentUser;
        const txRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);

        const comment = {
            text: commentText,
            createdBy: {
                uid: user?.uid || 'system',
                email: user?.email || 'system'
            },
            createdAt: Timestamp.now()
        };

        // Get current comments and append
        const txDoc = await getDocs(query(
            collection(db, COLLECTIONS.TRANSACTIONS),
            where('__name__', '==', transactionId)
        ));

        if (txDoc.empty) {
            throw new Error('Transaction not found');
        }

        const currentComments = txDoc.docs[0].data().comments || [];
        await updateDoc(txRef, {
            comments: [...currentComments, comment]
        });

        return serializeFirestoreData(comment);
    },

    /**
     * Update the PDF receipt URL for a transaction
     */
    updateReceiptUrl: async (transactionId, downloadUrl) => {
        const txRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
        await updateDoc(txRef, {
            receiptUrl: downloadUrl
        });
        return { transactionId, receiptUrl: downloadUrl };
    }
};
