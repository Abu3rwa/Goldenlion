const { TOOL_NAMES } = require("../utils/constants");
const { validateToolArgs } = require("../validators/toolValidators");
const { policyLookupTool } = require("./policyLookupTool");
const { productSearchTool } = require("./productSearchTool");
const { productByIdTool } = require("./productByIdTool");
const { orderStatusTool } = require("./orderStatusTool");
const { createTicketTool } = require("./createTicketTool");

const TOOL_MAP = {
  [TOOL_NAMES.POLICY_LOOKUP]: policyLookupTool,
  [TOOL_NAMES.PRODUCT_SEARCH]: productSearchTool,
  [TOOL_NAMES.PRODUCT_BY_ID]: productByIdTool,
  [TOOL_NAMES.ORDER_STATUS]: orderStatusTool,
  [TOOL_NAMES.CREATE_TICKET]: createTicketTool,
};

/**
 * @param {Array<{name:string,args:Record<string,any>}>} requests
 * @param {Record<string, any>} context
 */
async function executeToolRequests(requests = [], context = {}) {
  const results = [];
  for (const request of requests.slice(0, 4)) {
    const tool = TOOL_MAP[request.name];
    if (!tool) {
      continue;
    }
    const args = validateToolArgs(request.name, request.args || {});
    const toolResult = await tool({ ...args, ...context });
    results.push({
      name: request.name,
      args,
      result: toolResult,
    });
  }
  return results;
}

module.exports = {
  executeToolRequests,
  TOOL_MAP,
};
