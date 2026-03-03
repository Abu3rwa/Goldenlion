const crypto = require("node:crypto");
const { OTP_LIMITS } = require("../utils/constants");

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateOtpCode() {
  const min = 10 ** (OTP_LIMITS.CODE_LENGTH - 1);
  const max = 10 ** OTP_LIMITS.CODE_LENGTH - 1;
  return `${crypto.randomInt(min, max + 1)}`;
}

function safeEqualHash(hashA, hashB) {
  const a = Buffer.from(hashA || "", "utf8");
  const b = Buffer.from(hashB || "", "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  hashCode,
  generateOtpCode,
  safeEqualHash,
};
