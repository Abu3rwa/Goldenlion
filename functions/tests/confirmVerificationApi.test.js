jest.mock("../src/services/verificationService", () => ({
  confirmVerification: jest.fn(async () => "ORD-1001"),
}));

jest.mock("../src/utils/token", () => ({
  signVerificationToken: jest.fn(() => "token-123"),
}));

const { AppError } = require("../src/utils/appError");
const { confirmOrderVerificationApi } = require("../src/api/confirmOrderVerification");
const { confirmVerification } = require("../src/services/verificationService");

describe("confirmOrderVerification API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns token on successful OTP confirmation", async () => {
    const result = await confirmOrderVerificationApi({
      data: {
        sessionId: "session_abc1234567",
        code: "123456",
      },
      auth: { uid: "user-1" },
    });

    expect(confirmVerification).toHaveBeenCalledWith("session_abc1234567", "123456");
    expect(result).toEqual({ ok: true, verificationToken: "token-123" });
  });

  test("surfaces invalid OTP attempts for retry handling", async () => {
    confirmVerification.mockRejectedValueOnce(
      new AppError("verification/invalid-code", "Invalid verification code.", 400)
    );

    await expect(
      confirmOrderVerificationApi({
        data: {
          sessionId: "session_abc1234567",
          code: "000000",
        },
      })
    ).rejects.toMatchObject({
      details: expect.objectContaining({ code: "verification/invalid-code" }),
    });
  });
});
