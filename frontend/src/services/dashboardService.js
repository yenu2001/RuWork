import api from "./api";

export const dashboardService = {
  async getStudentDashboard() {
    const { data } = await api.get("/users/dashboard");
    return data;
  },
  async getStudentJobHistory(params = {}) {
    const { data } = await api.get("/users/job-history", { params });
    return data;
  },
  async getProviderDashboard() {
    const { data } = await api.get("/jobProviders/dashboard");
    return data;
  },
  async getAdminDashboard() {
    const { data } = await api.get("/admin/dashboard");
    return data;
  }
};
