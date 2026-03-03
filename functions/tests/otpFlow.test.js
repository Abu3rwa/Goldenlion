const { OTP_LIMITS } = require("../src/utils/constants");
const { generateOtpCode, hashCode, safeEqualHash } = require("../src/services/otpService");

describe("otp helpers", () => {
  test("generateOtpCode length", () => {
    const code = generateOtpCode();
    expect(code).toHaveLength(OTP_LIMITS.CODE_LENGTH);
  });

  test("hash compare works", () => {
    const code = "123456";
    const h1 = hashCode(code);
    const h2 = hashCode(code);
    const h3 = hashCode("654321");
    expect(safeEqualHash(h1, h2)).toBe(true);
    expect(safeEqualHash(h1, h3)).toBe(false);
  });
});
