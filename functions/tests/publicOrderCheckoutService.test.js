jest.mock("../src/services/analyticsService", () => {
  const actual = jest.requireActual("../src/services/analyticsService");
  return {
    ...actual,
    refreshAnalyticsForOrder: jest.fn().mockResolvedValue({ updatedProductIds: [] }),
  };
});

jest.mock("../src/services/publicCategoryAdminService", () => ({
  syncPublicCategoryCountsForList: jest.fn().mockResolvedValue([]),
}));

const {
  createPosSaleTransactional,
  createPublicOrderTransactional,
  findOrderByNumber,
  sanitizeTrackingPayload,
} = require("../src/services/publicOrderCheckoutService");

function makeTrackingDb({ ordersByNumber = {} } = {}) {
  return {
    collection(name) {
      if (name !== "publicOrders") {
        throw new Error(`unexpected collection: ${name}`);
      }
      return {
        where(field, op, value) {
          return {
            limit() {
              return {
                async get() {
                  const order = ordersByNumber[value] || null;
                  if (!order) return { empty: true, docs: [] };
                  return {
                    empty: false,
                    docs: [
                      {
                        id: order.id || "order_doc_1",
                        data: () => order,
                      },
                    ],
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function makeCheckoutDb(initialProducts = {}, options = {}) {
  const products = new Map(Object.entries(initialProducts));
  const orders = new Map();
  const enforceReadBeforeWrite = options.enforceReadBeforeWrite === true;

  const orderRef = {
    id: "order_doc_1",
    async get() {
      return {
        data: () => orders.get(this.id) || null,
      };
    },
  };

  const db = {
    _orders: orders,
    _products: products,
    collection(name) {
      if (name === "publicProducts") {
        return {
          doc(productId) {
            return { __type: "productRef", id: productId };
          },
        };
      }

      if (name === "publicOrders") {
        return {
          doc() {
            return orderRef;
          },
          where(field, op, value) {
            return {
              __type: "orderNumberQuery",
              value,
              limit() {
                return this;
              },
            };
          },
        };
      }

      throw new Error(`unexpected collection: ${name}`);
    },
    async runTransaction(handler) {
      let hasWrites = false;
      const transaction = {
        async get(target) {
          if (enforceReadBeforeWrite && hasWrites) {
            throw new Error("Firestore transactions require all reads to be executed before all writes.");
          }
          if (target.__type === "productRef") {
            const data = products.get(target.id);
            return {
              exists: Boolean(data),
              id: target.id,
              data: () => data,
            };
          }

          if (target.__type === "orderNumberQuery") {
            const exists = [...orders.values()].some((order) => order.orderNumber === target.value);
            return { empty: !exists, docs: [] };
          }

          throw new Error("unknown transaction target");
        },
        update(ref, payload) {
          hasWrites = true;
          const current = products.get(ref.id);
          products.set(ref.id, {
            ...current,
            ...payload,
          });
        },
        set(ref, payload) {
          hasWrites = true;
          orders.set(ref.id, payload);
        },
      };

      return handler(transaction);
    },
  };

  return db;
}

describe("public order checkout service", () => {
  test("sanitized public tracking payload excludes private customer fields", () => {
    const payload = sanitizeTrackingPayload({
      orderNumber: "GL-ORDER-1",
      status: "pending",
      createdAt: "2026-03-11T00:00:00.000Z",
      cityName: "طرابلس",
      subtotal: 1000,
      deliveryCharge: 200,
      total: 1200,
      customer: {
        name: "secret",
        phone: "0911111111",
        address: "hidden",
      },
      adminNotes: "internal",
      items: [{ productName: "شنطة", quantity: 1, price: 1000, subtotal: 1000 }],
    });

    expect(payload).toEqual(
      expect.objectContaining({
        orderNumber: "GL-ORDER-1",
        total: 1200,
      })
    );
    expect(payload.customer).toBeUndefined();
    expect(payload.adminNotes).toBeUndefined();
  });

  test("order lookup by unknown order number returns null", async () => {
    const db = makeTrackingDb({ ordersByNumber: {} });
    const order = await findOrderByNumber(db, "GL-NOT-FOUND");
    expect(order).toBeNull();
  });

  test("public order tracking ignores POS orders", async () => {
    const db = makeTrackingDb({
      ordersByNumber: {
        "POS-20260311-ABC123": {
          id: "pos-1",
          orderNumber: "POS-20260311-ABC123",
          channel: "pos",
          status: "delivered",
        },
      },
    });

    const order = await findOrderByNumber(db, "POS-20260311-ABC123", { includePos: false });
    expect(order).toBeNull();
  });

  test("checkout fails when stock is insufficient and no order is created", async () => {
    const db = makeCheckoutDb({
      p1: {
        id: "p1",
        name: "شنطة",
        price: 1000,
        costPrice: 400,
        inStock: true,
        totalStock: 1,
        categoryId: "bags",
      },
    });

    await expect(
      createPublicOrderTransactional(db, {
        customerName: "عميل",
        customerPhone: "0911111111",
        customerAddress: "عنوان",
        cityId: "tripoli",
        cityName: "طرابلس",
        deliveryCharge: 200,
        items: [{ productId: "p1", quantity: 2 }],
      })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    expect(db._orders.size).toBe(0);
  });

  test("repeated checkout rejects oversell and variant stock deduction works", async () => {
    const db = makeCheckoutDb({
      p1: {
        id: "p1",
        name: "منتج ألوان",
        price: 1500,
        costPrice: 700,
        inStock: true,
        totalStock: 2,
        categoryId: "bags",
        colorVariants: [
          { color: "أسود", colorCode: "#000", colorKey: "اسود", quantity: 1 },
          { color: "بني", colorCode: "#333", colorKey: "بني", quantity: 2 },
        ],
      },
    });

    const firstOrder = await createPublicOrderTransactional(db, {
      customerName: "عميل أول",
      customerPhone: "0911111111",
      customerAddress: "عنوان",
      cityId: "tripoli",
      cityName: "طرابلس",
      deliveryCharge: 100,
        items: [{ productId: "p1", quantity: 1, selectedColor: { color: "أسود", colorKey: "اسود" } }],
    });

    expect(firstOrder.items[0].selectedColor.color).toBe("أسود");

    await expect(
      createPublicOrderTransactional(db, {
        customerName: "عميل ثاني",
        customerPhone: "0922222222",
        customerAddress: "عنوان",
        cityId: "tripoli",
        cityName: "طرابلس",
        deliveryCharge: 100,
        items: [{ productId: "p1", quantity: 1, selectedColor: { color: "أسود", colorKey: "اسود" } }],
      })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  test("POS sale succeeds with paid delivered metadata and seller context", async () => {
    const db = makeCheckoutDb({
      p1: {
        id: "p1",
        name: "شنطة عملية",
        code: "BAG-001",
        price: 1800,
        costPrice: 700,
        inStock: true,
        totalStock: 4,
        categoryId: "bags",
      },
    });

    const order = await createPosSaleTransactional(
      db,
      {
        customerName: "عميل مباشر",
        customerPhone: "0911111111",
        notes: "بيع مباشر",
        items: [{ productId: "p1", quantity: 1 }],
      },
      {
        uid: "seller-1",
        displayName: "Cashier One",
      }
    );

    expect(order.channel).toBe("pos");
    expect(order.status).toBe("delivered");
    expect(order.paymentStatus).toBe("paid");
    expect(order.paymentMethod).toBe("cash");
    expect(order.soldByUserId).toBe("seller-1");
    expect(order.soldByUserName).toBe("Cashier One");
    expect(order.orderNumber).toMatch(/^POS-/);
  });

  test("transactional order creation performs all reads before writes", async () => {
    const db = makeCheckoutDb({
      p1: {
        id: "p1",
        name: "شنطة عملية",
        price: 1800,
        costPrice: 700,
        inStock: true,
        totalStock: 4,
        categoryId: "bags",
      },
      p2: {
        id: "p2",
        name: "محفظة جلد",
        price: 900,
        costPrice: 300,
        inStock: true,
        totalStock: 2,
        categoryId: "wallets",
      },
    }, { enforceReadBeforeWrite: true });

    const order = await createPublicOrderTransactional(db, {
      customerName: "عميل",
      customerPhone: "0911111111",
      customerAddress: "عنوان",
      cityId: "tripoli",
      cityName: "طرابلس",
      deliveryCharge: 100,
      items: [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 1 },
      ],
    });

    expect(order.items).toHaveLength(2);
    expect(db._orders.size).toBe(1);
  });
});
