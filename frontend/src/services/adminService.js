import api from "./api";

export const adminService = {
  async getRegistrations(params = {}) {
    const { data } = await api.get("/admin/registrations", { params });
    return data;
  },
  async getRegistration(type, id) {
    const { data } = await api.get(`/admin/registrations/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
    return data.registration;
  },
  async approveRegistration(type, id) {
    const { data } = await api.patch(`/admin/registrations/${encodeURIComponent(type)}/${encodeURIComponent(id)}/approve`);
    return data;
  },
  async rejectRegistration(type, id, rejectionReason) {
    const { data } = await api.patch(`/admin/registrations/${encodeURIComponent(type)}/${encodeURIComponent(id)}/reject`, { rejectionReason });
    return data;
  },
  async getAccounts(type, params = {}) {
    const { data } = await api.get(`/admin/${type}`, { params });
    return data;
  },
  async getAccount(type, id) {
    const { data } = await api.get(`/admin/${type}/${encodeURIComponent(id)}`);
    return data.account;
  },
  async moderateAccount(type, id, status, reason = "") {
    const { data } = await api.patch(`/admin/${type}/${encodeURIComponent(id)}/moderation`, { status, ...(reason ? { reason } : {}) });
    return data;
  },
  async getJobs(params = {}) {
    const { data } = await api.get("/admin/jobs", { params });
    return data;
  },
  async getJob(id) {
    const { data } = await api.get(`/admin/jobs/${encodeURIComponent(id)}`);
    return data.job;
  },
  async moderateJob(id, status, reason = "") {
    const { data } = await api.patch(`/admin/jobs/${encodeURIComponent(id)}/moderation`, { status, ...(reason ? { reason } : {}) });
    return data;
  },
  async moderateReview(id, status, reason = "") {
    const { data } = await api.patch(`/admin/reviews/${encodeURIComponent(id)}/moderation`, { status, ...(reason ? { reason } : {}) });
    return data;
  },
  async getSettings() {
    const { data } = await api.get("/admin/settings");
    return data.settings;
  },
  async updateSettings(settings) {
    const { data } = await api.patch("/admin/settings", settings);
    return data;
  },
  async getAudits(params = {}) {
    const { data } = await api.get("/admin/audits", { params });
    return data;
  }
};
