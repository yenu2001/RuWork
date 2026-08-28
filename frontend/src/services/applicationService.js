import api from "./api";

function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

export const applicationService = {
  async applyToJob(jobId, payload) {
    const { data } = await api.post(`/jobs/${encodeURIComponent(jobId)}/applications`, payload);
    return data;
  },
  async getMyApplicationForJob(jobId) {
    const { data } = await api.get(`/applications/my/job/${encodeURIComponent(jobId)}`);
    return data.application;
  },
  async getMyApplications(params) {
    const { data } = await api.get("/applications/my", { params: cleanParams(params) });
    return data;
  },
  async getMyApplication(id) {
    const { data } = await api.get(`/applications/my/${encodeURIComponent(id)}`);
    return data.application;
  },
  async withdrawApplication(id) {
    const { data } = await api.patch(`/applications/my/${encodeURIComponent(id)}/withdraw`);
    return data;
  },
  async cancelApplication(id, cancellationReason) {
    const { data } = await api.patch(`/applications/my/${encodeURIComponent(id)}/cancel`, { cancellationReason });
    return data;
  },
  async getJobApplications(jobId, params) {
    const { data } = await api.get(`/jobs/${encodeURIComponent(jobId)}/applications`, { params: cleanParams(params) });
    return data;
  },
  async getProviderApplication(id) {
    const { data } = await api.get(`/applications/provider/${encodeURIComponent(id)}`);
    return data.application;
  },
  async acceptApplication(id, payload) {
    const { data } = await api.patch(`/applications/provider/${encodeURIComponent(id)}/accept`, payload);
    return data;
  },
  async declineApplication(id, declineReason) {
    const { data } = await api.patch(`/applications/provider/${encodeURIComponent(id)}/decline`, { declineReason });
    return data;
  },
  async completeApplication(id) {
    const { data } = await api.patch(`/applications/provider/${encodeURIComponent(id)}/complete`);
    return data;
  }
};
