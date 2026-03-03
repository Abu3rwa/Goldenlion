/**
 * @param {Record<string, any>} data
 * @returns {Record<string, any>}
 */
function ok(data = {}) {
  return { ok: true, ...data };
}

module.exports = { ok };
