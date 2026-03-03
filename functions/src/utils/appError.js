class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status=400]
   * @param {Record<string, any>} [details={}]
   */
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

module.exports = { AppError };
