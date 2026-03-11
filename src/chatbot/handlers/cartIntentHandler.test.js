import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../../store/cartSlice";
import { handleCartIntent } from "./cartIntentHandler";

const PHONE = {
  id: "phone-1",
  name: "iPhone 15",
  nameEn: "iPhone 15",
  categoryName: "Phones",
  inStock: true,
  price: 250000,
  totalStock: 5,
  colorVariants: [],
  images: ["https://img/phone.jpg"],
};

const IPHONE_CHARGER = {
  id: "charger-1",
  name: "iPhone Charger",
  nameEn: "iPhone Charger",
  categoryName: "Phone Accessories",
  tags: ["charger", "iphone"],
  inStock: true,
  price: 9000,
  totalStock: 10,
  colorVariants: [],
  images: ["https://img/charger.jpg"],
};

const CASE = {
  id: "case-1",
  name: "iPhone Case",
  nameEn: "iPhone Case",
  categoryName: "Phone Accessories",
  tags: ["case", "iphone"],
  inStock: true,
  price: 12000,
  totalStock: 12,
  colorVariants: [],
  images: ["https://img/case.jpg"],
};

const GALAXY_CHARGER_FAST = {
  id: "galaxy-fast",
  name: "Galaxy Charger Fast",
  nameEn: "Galaxy Charger Fast",
  categoryName: "Phone Accessories",
  tags: ["charger", "galaxy"],
  inStock: true,
  price: 8000,
  totalStock: 8,
  colorVariants: [],
  images: ["https://img/galaxy-fast.jpg"],
};

const GALAXY_CHARGER_ORIGINAL = {
  id: "galaxy-original",
  name: "Galaxy Charger Original",
  nameEn: "Galaxy Charger Original",
  categoryName: "Phone Accessories",
  tags: ["charger", "galaxy"],
  inStock: true,
  price: 11000,
  totalStock: 7,
  colorVariants: [],
  images: ["https://img/galaxy-original.jpg"],
};

const OUT_OF_STOCK_MOUSE = {
  id: "mouse-1",
  name: "Wireless Mouse",
  nameEn: "Wireless Mouse",
  categoryName: "Computer Accessories",
  tags: ["mouse"],
  inStock: false,
  price: 15000,
  totalStock: 0,
  colorVariants: [],
  images: ["https://img/mouse.jpg"],
};

const CATALOG = [
  PHONE,
  IPHONE_CHARGER,
  CASE,
  GALAXY_CHARGER_FAST,
  GALAXY_CHARGER_ORIGINAL,
  OUT_OF_STOCK_MOUSE,
];

const createStore = (items = []) => {
  return configureStore({
    reducer: {
      cart: cartReducer,
    },
    preloadedState: {
      cart: {
        items,
        isOpen: false,
        inventoryNotice: "",
      },
    },
  });
};

const createProductService = () => ({
  getAllProducts: vi.fn(async () => CATALOG),
  getProductById: vi.fn(async (productId) => CATALOG.find((product) => product.id === productId) || null),
});

const buildContext = (store, productService, extra = {}) => ({
  message: "",
  pageContext: { path: "/store", hash: "", title: "Store" },
  messages: [],
  pendingAction: null,
  dispatch: store.dispatch,
  getState: store.getState,
  companyCurrency: "د.ل",
  catalogProducts: CATALOG,
  productService,
  ...extra,
});

describe("handleCartIntent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("adds an item successfully from chat", async () => {
    const store = createStore();
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "put iphone 15 in my cart",
    }));

    expect(response.handled).toBe(true);
    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].productId).toBe("phone-1");
    expect(response.assistantText).toContain("تمت إضافة");
  });

  it("adds with an explicit quantity", async () => {
    const store = createStore();
    const productService = createProductService();

    await handleCartIntent(buildContext(store, productService, {
      message: "add 2 iphone charger",
    }));

    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].quantity).toBe(2);
  });

  it("handles product not found safely", async () => {
    const store = createStore();
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "add moon lamp",
    }));

    expect(response.assistantText).toContain("ما لقيتش منتج");
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("returns a disambiguation response for ambiguous matches", async () => {
    const store = createStore();
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "add galaxy charger",
    }));

    expect(response.assistantText).toContain("لقيت أكثر من منتج");
    expect(response.pendingAction?.type).toBe("product_disambiguation");
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("handles out-of-stock products clearly", async () => {
    const store = createStore();
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "add wireless mouse",
    }));

    expect(response.assistantText).toContain("غير متوفر");
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("removes an item from the cart", async () => {
    const store = createStore([
      {
        cartKey: "charger-1",
        productId: "charger-1",
        productName: "iPhone Charger",
        productNameEn: "iPhone Charger",
        price: 9000,
        quantity: 1,
        image: "",
        selectedColor: null,
      },
    ]);
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "remove iphone charger from my cart",
    }));

    expect(response.assistantText).toContain("تم حذف");
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("updates quantity successfully", async () => {
    const store = createStore([
      {
        cartKey: "charger-1",
        productId: "charger-1",
        productName: "iPhone Charger",
        productNameEn: "iPhone Charger",
        price: 9000,
        quantity: 1,
        image: "",
        selectedColor: null,
      },
    ]);
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "set iphone charger quantity to 3",
    }));

    expect(response.assistantText).toContain("تم تحديث كمية");
    expect(store.getState().cart.items[0].quantity).toBe(3);
  });

  it("shows cart contents and totals", async () => {
    const store = createStore([
      {
        cartKey: "phone-1",
        productId: "phone-1",
        productName: "iPhone 15",
        productNameEn: "iPhone 15",
        price: 250000,
        quantity: 1,
        image: "",
        selectedColor: null,
      },
      {
        cartKey: "charger-1",
        productId: "charger-1",
        productName: "iPhone Charger",
        productNameEn: "iPhone Charger",
        price: 9000,
        quantity: 2,
        image: "",
        selectedColor: null,
      },
    ]);
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "show my cart",
    }));

    expect(response.assistantText).toContain("السلة الحالية");
    expect(response.assistantText).toContain("iPhone 15");
    expect(response.assistantText).toContain("عدد القطع: 3");
  });

  it("supports clear cart confirmation flow", async () => {
    const store = createStore([
      {
        cartKey: "phone-1",
        productId: "phone-1",
        productName: "iPhone 15",
        productNameEn: "iPhone 15",
        price: 250000,
        quantity: 1,
        image: "",
        selectedColor: null,
      },
    ]);
    const productService = createProductService();

    const prompt = await handleCartIntent(buildContext(store, productService, {
      message: "clear my cart",
    }));
    expect(prompt.pendingAction?.type).toBe("clear_cart_confirmation");

    const confirmed = await handleCartIntent(buildContext(store, productService, {
      message: "yes",
      pendingAction: prompt.pendingAction,
    }));

    expect(confirmed.assistantText).toContain("تم مسح السلة");
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("returns the total calculation response", async () => {
    const store = createStore([
      {
        cartKey: "charger-1",
        productId: "charger-1",
        productName: "iPhone Charger",
        productNameEn: "iPhone Charger",
        price: 9000,
        quantity: 2,
        image: "",
        selectedColor: null,
      },
    ]);
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "how much is my cart total",
    }));

    expect(response.assistantText).toContain("المجموع الفرعي");
    expect(response.assistantText).toContain("الإجمالي الحالي");
  });

  it("suggests related products after add", async () => {
    const store = createStore();
    const productService = createProductService();

    const response = await handleCartIntent(buildContext(store, productService, {
      message: "add iphone 15",
    }));

    expect(response.productCards?.length).toBeGreaterThan(0);
    expect(response.productCards.some((card) => card.id === "charger-1" || card.id === "case-1")).toBe(true);
  });
});
