import api from "./api";

const VERIFICATION_PATHS = {
  student: "/users",
  jobProvider: "/jobProviders"
};

// Password and session endpoints are keyed by JWT role so any signed-in workspace can reach them.
const ROLE_PATHS = {
  student: "/users",
  Job_Provider: "/jobProviders",
  admin: "/admin"
};

function verificationBase(accountType) {
  const path = VERIFICATION_PATHS[accountType];
  if (!path) throw new Error("Unsupported RuWork account type");
  return path;
}

function roleBase(role) {
  const path = ROLE_PATHS[role];
  if (!path) throw new Error("Unsupported RuWork role");
  return path;
}

export const authService = {
  async registerStudent(payload) {
    const { data } = await api.post("/users", payload);
    return data;
  },

  async registerJobProvider(payload) {
    const { data } = await api.post("/jobProviders", payload);
    return data;
  },

  async loginStudent(credentials) {
    const { data } = await api.post("/users/login", credentials);
    return data;
  },

  async loginJobProvider(credentials) {
    const { data } = await api.post("/jobProviders/login", credentials);
    return data;
  },

  async loginAdmin(credentials) {
    const { data } = await api.post("/admin/login", credentials);
    return data;
  },

  async verifyEmail(accountType, token) {
    const { data } = await api.get(`${verificationBase(accountType)}/verify-email/${encodeURIComponent(token)}`);
    return data;
  },

  async resendVerification(accountType, email) {
    const field = accountType === "student" ? "email" : "companyEmail";
    const { data } = await api.post(`${verificationBase(accountType)}/resend-verification`, { [field]: email });
    return data;
  },

  async requestPasswordReset(accountType, email) {
    const field = accountType === "student" ? "email" : "companyEmail";
    const { data } = await api.post(`${verificationBase(accountType)}/password/forgot`, { [field]: email });
    return data;
  },

  async resetPassword(accountType, token, newPassword) {
    const { data } = await api.post(`${verificationBase(accountType)}/password/reset`, { token, newPassword });
    return data;
  },

  async changePassword(role, currentPassword, newPassword) {
    const { data } = await api.patch(`${roleBase(role)}/password`, { currentPassword, newPassword });
    return data;
  },

  async logout(role) {
    const { data } = await api.post(`${roleBase(role)}/logout`);
    return data;
  }
};

export { ROLE_PATHS };
