jest.mock("../src/services/rateLimitService", () => ({
  enforceRateLimit: jest.fn(async () => {}),
}));

jest.mock("../src/services/chatSessionService", () => ({
  touchSession: jest.fn(async () => {}),
  loadRecentMessages: jest.fn(async () => []),
  saveMessage: jest.fn(async () => {}),
}));

jest.mock("../src/services/geminiService", () => ({
  planWithGemini: jest.fn(async () => ({ intent: "other", toolRequests: [], answerDraft: "" })),
}));

jest.mock("../src/tools", () => ({
  executeToolRequests: jest.fn(async () => []),
}));

const { chatSendMessage } = require("../src/api/chatSendMessage");
const { executeToolRequests } = require("../src/tools");

function makeRequest(message) {
  return {
    data: {
      sessionId: "session_abc1234567",
      locale: "ar",
      message,
      pageContext: {},
      userId: null,
    },
    rawRequest: {
      headers: {},
      ip: "127.0.0.1",
    },
  };
}

describe("chatSendMessage order tracking flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("asks for order number when missing", async () => {
    const result = await chatSendMessage(makeRequest("تتبع الطلب"));

    expect(result.ok).toBe(true);
    expect(result.requiresVerification).toBe(false);
    expect(result.assistantText).toContain("اكتب رقم الطلب");
  });

  test("returns detailed status immediately after receiving the order number", async () => {
    executeToolRequests.mockResolvedValueOnce([
      {
        name: "order_status",
        args: { orderNumber: "ORD-1001" },
        result: {
          record: {
            orderNumber: "ORD-1001",
            status: "shipped",
            trackingNumber: "TRK-777",
            carrier: "DHL",
            eta: "2026-03-12",
          },
        },
      },
    ]);

    const result = await chatSendMessage(makeRequest("تتبع الطلب ORD-1001"));

    expect(result.ok).toBe(true);
    expect(result.requiresVerification).toBe(false);
    expect(result.verificationOrderNumber).toBeNull();
    expect(result.assistantText).toContain("TRK-777");
    expect(result.assistantText).toContain("DHL");
  });

  test("returns detailed status for another tracked order", async () => {
    executeToolRequests.mockResolvedValueOnce([
      {
        name: "order_status",
        args: { orderNumber: "ORD-1001" },
        result: {
          record: {
            orderNumber: "ORD-1001",
            status: "shipped",
            trackingNumber: "TRK-777",
            carrier: "DHL",
            eta: "2026-03-12",
          },
        },
      },
    ]);

    const result = await chatSendMessage(makeRequest("تتبع الطلب ORD-1001"));

    expect(result.ok).toBe(true);
    expect(result.requiresVerification).toBe(false);
    expect(result.assistantText).toContain("TRK-777");
    expect(result.assistantText).toContain("DHL");
  });

  test("treats order number only message as tracking request", async () => {
    executeToolRequests.mockResolvedValueOnce([
      {
        name: "order_status",
        args: { orderNumber: "ORD-1001" },
        result: {
          record: {
            orderNumber: "ORD-1001",
            status: "processing",
          },
        },
      },
    ]);

    const result = await chatSendMessage(makeRequest("ORD-1001"));

    expect(result.ok).toBe(true);
    expect(result.requiresVerification).toBe(false);
    expect(result.assistantText).toContain("ORD-1001");
  });
});
