const { HttpsError } = require("firebase-functions/v2/https");
const { AppError } = require("./appError");

/**
 * @param {(request:any)=>Promise<any>} handler
 */
function makeCallable(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpsError("failed-precondition", error.message, {
          code: error.code,
          status: error.status,
          details: error.details || {},
        });
      }
      throw new HttpsError("internal", "Unexpected server error.", {
        message: `${error?.message || error}`,
      });
    }
  };
}

module.exports = { makeCallable };
