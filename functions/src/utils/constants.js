const LOCALES = {
  AR: "ar",
  EN: "en",
};

const CHAT_LIMITS = {
  MAX_MESSAGE_LENGTH: 1200,
  MIN_MESSAGE_LENGTH: 1,
  HISTORY_LIMIT: 20,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: 12,
};

const OTP_LIMITS = {
  CODE_LENGTH: 6,
  EXPIRES_IN_MS: 10 * 60 * 1000,
  MAX_ATTEMPTS: 5,
  LOCKOUT_MS: 15 * 60 * 1000,
};

const TOOL_NAMES = {
  POLICY_LOOKUP: "policy_lookup",
  PRODUCT_SEARCH: "product_search",
  PRODUCT_BY_ID: "product_by_id",
  ORDER_STATUS: "order_status",
  CREATE_TICKET: "create_ticket",
};

module.exports = {
  LOCALES,
  CHAT_LIMITS,
  OTP_LIMITS,
  TOOL_NAMES,
};
