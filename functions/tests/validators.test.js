const { validateChatSendMessage } = require("../src/validators/chatValidators");
const { validateToolArgs } = require("../src/validators/toolValidators");

describe("validators", () => {
  test("chatSendMessage accepts valid payload", () => {
    expect(() =>
      validateChatSendMessage({
        sessionId: "session_abc1234567",
        message: "شن شروط الاسترجاع",
        locale: "ar",
      })
    ).not.toThrow();
  });

  test("chatSendMessage rejects invalid locale", () => {
    expect(() =>
      validateChatSendMessage({
        sessionId: "session_abc1234567",
        message: "hello",
        locale: "fr",
      })
    ).toThrow();
  });

  test("product_search limit is clamped", () => {
    const args = validateToolArgs("product_search", { limit: 99 });
    expect(args.limit).toBe(6);
  });
});
