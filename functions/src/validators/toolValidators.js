const { AppError } = require("../utils/appError");

function asNumber(value) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeLimit(value, fallback = 4) {
  const limit = asNumber(value);
  if (!limit) {
    return fallback;
  }
  return Math.min(6, Math.max(1, limit));
}

/**
 * @param {string} toolName
 * @param {Record<string, any>} args
 */
function validateToolArgs(toolName, args = {}) {
  switch (toolName) {
    case "policy_lookup":
      if (!args.topic || typeof args.topic !== "string") {
        throw new AppError("validation/invalid-tool-args", "policy_lookup requires topic.");
      }
      return { topic: args.topic.trim(), locale: args.locale === "en" ? "en" : "ar" };

    case "product_search":
      return {
        query: `${args.query || ""}`.trim(),
        category: `${args.category || ""}`.trim(),
        minPrice: asNumber(args.minPrice),
        maxPrice: asNumber(args.maxPrice),
        tags: Array.isArray(args.tags) ? args.tags.slice(0, 8) : [],
        limit: sanitizeLimit(args.limit),
      };

    case "product_by_id":
      if (!args.productId || typeof args.productId !== "string") {
        throw new AppError("validation/invalid-tool-args", "product_by_id requires productId.");
      }
      return { productId: args.productId.trim() };

    case "order_status":
      if (!args.orderNumber || typeof args.orderNumber !== "string") {
        throw new AppError("validation/invalid-tool-args", "order_status requires orderNumber.");
      }
      return {
        orderNumber: args.orderNumber.trim(),
      };

    case "create_ticket":
      if (!args.contact || !args.summary) {
        throw new AppError("validation/invalid-tool-args", "create_ticket requires contact and summary.");
      }
      return {
        contact: `${args.contact}`.trim(),
        summary: `${args.summary}`.trim(),
      };

    default:
      throw new AppError("validation/disallowed-tool", `Tool ${toolName} is not allowlisted.`);
  }
}

module.exports = {
  validateToolArgs,
};
