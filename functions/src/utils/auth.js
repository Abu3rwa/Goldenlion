const { AppError } = require("./appError");
const { db } = require("./firestore");

const ROLE_OWNER = "owner";
const ROLE_SALES_MANAGER = "sales_manager";

const normalizeRoles = (data = {}) => {
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    return data.roles;
  }
  if (data.role) {
    return [data.role];
  }
  return [];
};

async function getAuthenticatedUserContext(request) {
  const uid = request?.auth?.uid;
  if (!uid) {
    throw new AppError("UNAUTHENTICATED", "يجب تسجيل الدخول للوصول إلى هذه العملية.", 401);
  }

  const userSnapshot = await db.collection("users").doc(uid).get();
  const userData = userSnapshot.exists ? (userSnapshot.data() || {}) : {};
  const roles = normalizeRoles(userData);

  return {
    uid,
    roles,
    displayName: userData.displayName || request.auth.token?.name || request.auth.token?.email || uid,
    email: userData.email || request.auth.token?.email || "",
  };
}

async function assertHasAnyRole(request, allowedRoles) {
  const context = await getAuthenticatedUserContext(request);
  if (!context.roles.some((role) => allowedRoles.includes(role))) {
    throw new AppError("FORBIDDEN", "غير مصرح لك بتنفيذ هذه العملية.", 403, {
      requiredRoles: allowedRoles,
      currentRoles: context.roles,
    });
  }
  return context;
}

async function assertOwner(request) {
  return assertHasAnyRole(request, [ROLE_OWNER]);
}

async function assertStoreManager(request) {
  return assertHasAnyRole(request, [ROLE_OWNER, ROLE_SALES_MANAGER]);
}

module.exports = {
  ROLE_OWNER,
  ROLE_SALES_MANAGER,
  assertHasAnyRole,
  assertOwner,
  assertStoreManager,
  getAuthenticatedUserContext,
};
