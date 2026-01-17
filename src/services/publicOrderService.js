import { db } from './firebaseConfig';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    where,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { COLLECTIONS, ORDER_STATUS, PAYMENT_STATUS } from '../utils/constants';
import { serializeFirestoreData } from '../utils/serialization';

/**
 * Generate unique order number
 */
const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GL-${dateStr}-${random}`;
};

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
        const orderNumber = generateOrderNumber();

        const newOrder = {
            orderNumber,
            customer: {
                name: orderData.customerName,
                phone: orderData.customerPhone,
                address: orderData.customerAddress,
                email: orderData.customerEmail || ''
            },
            cityId: orderData.cityId,
            cityName: orderData.cityName,
            deliveryCharge: orderData.deliveryCharge,
            items: orderData.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            })),
            subtotal: orderData.subtotal,
            total: orderData.total,
            status: ORDER_STATUS.PENDING,
            paymentMethod: 'cash',
            paymentStatus: PAYMENT_STATUS.UNPAID,
            customerNotes: orderData.customerNotes || '',
            adminNotes: '',
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.PUBLIC_ORDERS), newOrder);

        return serializeFirestoreData({
            id: docRef.id,
            orderNumber,
            ...newOrder
        });
    },

    /**
     * Update order status
     */
    updateOrderStatus: async (id, status) => {
        const orderRef = doc(db, COLLECTIONS.PUBLIC_ORDERS, id);

        const updateData = {
            status,
            updatedAt: serverTimestamp()
        };

        // Add timestamp for specific status changes
        if (status === ORDER_STATUS.CONFIRMED) {
            updateData.confirmedAt = serverTimestamp();
        } else if (status === ORDER_STATUS.SHIPPED) {
            updateData.shippedAt = serverTimestamp();
        } else if (status === ORDER_STATUS.DELIVERED) {
            updateData.deliveredAt = serverTimestamp();
            updateData.paymentStatus = PAYMENT_STATUS.PAID; // Cash on delivery = paid when delivered
        }

        await updateDoc(orderRef, updateData);

        const updatedDoc = await getDoc(orderRef);
        return serializeFirestoreData({ id: updatedDoc.id, ...updatedDoc.data() });
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
            totalRevenue: 0
        };

        querySnapshot.docs.forEach(doc => {
            const order = doc.data();
            stats.total++;
            stats[order.status]++;
            if (order.status === ORDER_STATUS.DELIVERED) {
                stats.totalRevenue += order.total;
            }
        });

        return stats;
    }
};
