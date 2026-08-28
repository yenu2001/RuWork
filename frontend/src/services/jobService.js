import api from "./api";

function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

export const jobService = {
  async getJobs(params) {
    const { data } = await api.get("/jobs", { params: cleanParams(params) });
    return data;
  },

  async getJob(id) {
    const { data } = await api.get(`/jobs/${encodeURIComponent(id)}`);
    return data.job;
  },

  async getMyJobs(params) {
    const { data } = await api.get("/jobs/my", { params: cleanParams(params) });
    return data;
  },

  async getMyJob(id) {
    const { data } = await api.get(`/jobs/my/${encodeURIComponent(id)}`);
    return data.job;
  },

  async createJob(payload) {
    const { data } = await api.post("/jobs", payload);
    return data;
  },

  async updateJob(id, payload) {
    const { data } = await api.patch(`/jobs/${encodeURIComponent(id)}`, payload);
    return data;
  },

  async deleteJob(id) {
    const { data } = await api.delete(`/jobs/${encodeURIComponent(id)}`);
    return data;
  }
};
