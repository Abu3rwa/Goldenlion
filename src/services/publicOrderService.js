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

        // Prepare items with color info and cost
        const orderItems = orderData.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            costPrice: item.costPrice || 0,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            selectedColor: item.selectedColor || null
        }));

        // Calculate profit
        const totalRevenue = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        const totalCost = orderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
        const estimatedProfit = totalRevenue - totalCost;

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
            items: orderItems,
            subtotal: orderData.subtotal,
            total: orderData.total,
            totalCost: totalCost,
            estimatedProfit: estimatedProfit,
            status: ORDER_STATUS.PENDING,
            paymentMethod: 'cash',
            paymentStatus: PAYMENT_STATUS.UNPAID,
            customerNotes: orderData.customerNotes || '',
            adminNotes: '',
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.PUBLIC_ORDERS), newOrder);

        // Deduct stock for each item with color variant
        // This is done after order creation to ensure order is saved first
        // In production, consider using transactions for atomicity
        for (const item of orderItems) {
            if (item.selectedColor) {
                try {
                    // Import dynamically to avoid circular dependency
                    const { publicProductService } = await import('./publicProductService');
                    await publicProductService.deductVariantStock(
                        item.productId,
                        item.selectedColor.color,
                        item.quantity
                    );
                } catch (err) {
                    console.error('Failed to deduct stock:', err);
                    // Continue - order is already placed
                }
            }
        }

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
