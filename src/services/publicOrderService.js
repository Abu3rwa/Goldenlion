import { db } from './firebaseConfig';
import {
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { COLLECTIONS, ORDER_STATUS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';
import { normalizeColorKey } from '../utils/cartUtils';
import { app } from './firebaseConfig';

const functions = getFunctions(app, 'us-central1');
const createPublicCheckoutOrderFn = httpsCallable(functions, 'createPublicCheckoutOrder');
const getPublicOrderTrackingFn = httpsCallable(functions, 'getPublicOrderTracking');
const createPosSaleFn = httpsCallable(functions, 'createPosSale');
const updateManagedOrderStatusFn = httpsCallable(functions, 'updateManagedOrderStatus');

/**
 * Service for managing public store orders
 */
export const publicOrderService = {
    /**
     * Get all orders (for admin)
     */
    getAllOrders: async () => {
        const q = query(
            collection(db, COLLECTIONS.PUBLIC_ORDERS),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const orders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(orders);
    },

    /**
     * Get orders by status
     */
    getOrdersByStatus: async (status) => {
        const q = query(
            collection(db, COLLECTIONS.PUBLIC_ORDERS),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const orders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return serializeFirestoreData(orders);
    },

    /**
     * Get single order by ID
     */
    getOrderById: async (id) => {
        const docRef = doc(db, COLLECTIONS.PUBLIC_ORDERS, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return serializeFirestoreData({ id: docSnap.id, ...docSnap.data() });
        }
        return null;
    },

    /**
     * Create new order (public - no auth required)
     */
    createOrder: async (orderData) => {
        const safePayload = {
            ...orderData,
            items: Array.isArray(orderData?.items)
                ? orderData.items.map((item) => ({
                    ...item,
                    selectedColor: item?.selectedColor
                        ? {
                            ...item.selectedColor,
                            colorKey: normalizeColorKey(item.selectedColor.colorKey || item.selectedColor.color),
                        }
                        : null,
                }))
                : [],
        };

        const result = await createPublicCheckoutOrderFn(safePayload);
        if (!result?.data?.ok || !result?.data?.order) {
            throw new Error('فشل إنشاء الطلب. حاول مرة أخرى.');
        }

        return serializeFirestoreData(result.data.order);
    },

    getPublicOrderTracking: async (orderNumber) => {
        const normalizedOrderNumber = `${orderNumber || ''}`.trim();
        const result = await getPublicOrderTrackingFn({ orderNumber: normalizedOrderNumber });
        const payload = result?.data || {};

        if (!payload.ok) {
            throw new Error('تعذر تحميل تتبع الطلب.');
        }

        if (!payload.found || !payload.order) {
            return null;
        }

        return serializeFirestoreData(payload.order);
    },

    /**
     * Update order status
     */
    updateOrderStatus: async (id, status) => {
        const result = await updateManagedOrderStatusFn({ orderId: id, status });
        if (!result?.data?.ok || !result?.data?.order) {
            throw new Error('تعذر تحديث حالة الطلب.');
        }
        return serializeFirestoreData(result.data.order);
    },

    createPosSale: async (saleData) => {
        const safePayload = {
            ...saleData,
            items: Array.isArray(saleData?.items)
                ? saleData.items.map((item) => ({
                    ...item,
                    selectedColor: item?.selectedColor
                        ? {
                            ...item.selectedColor,
                            colorKey: normalizeColorKey(item.selectedColor.colorKey || item.selectedColor.color),
                        }
                        : null,
                }))
                : [],
        };

        const result = await createPosSaleFn(safePayload);
        if (!result?.data?.ok || !result?.data?.order) {
            throw new Error('فشل إتمام عملية البيع من نقطة البيع.');
        }

        return serializeFirestoreData(result.data.order);
    },

    /**
     * Add admin note to order
     */
    addAdminNote: async (id, note) => {
        const orderRef = doc(db, COLLECTIONS.PUBLIC_ORDERS, id);
        await updateDoc(orderRef, {
            adminNotes: note,
            updatedAt: serverTimestamp()
        });

        const updatedDoc = await getDoc(orderRef);
        return serializeFirestoreData({ id: updatedDoc.id, ...updatedDoc.data() });
    },

    /**
     * Get order statistics
     */
    getOrderStats: async () => {
        const ordersRef = collection(db, COLLECTIONS.PUBLIC_ORDERS);
        const querySnapshot = await getDocs(ordersRef);

        const stats = {
            total: 0,
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0
        };

        querySnapshot.docs.forEach(doc => {
            const order = doc.data();
            stats.total++;
            stats[order.status]++;
            if (order.status === ORDER_STATUS.DELIVERED) {
                stats.totalRevenue += order.total || 0;
                stats.totalCost += order.totalCost || 0;
                stats.totalProfit += order.estimatedProfit || (order.total - (order.totalCost || 0));
            }
        });

        return stats;
    }
};
