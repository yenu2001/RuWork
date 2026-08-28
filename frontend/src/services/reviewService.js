import api from "./api";

function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

export const reviewService = {
  async createReview(payload) {
    const { data } = await api.post("/reviews", payload);
    return data;
  },
  async getMyReviewForApplication(applicationId) {
    const { data } = await api.get(`/reviews/my/application/${encodeURIComponent(applicationId)}`);
    return data.review;
  },
  async deleteMyReview(id) {
    const { data } = await api.delete(`/reviews/${encodeURIComponent(id)}`);
    return data;
  },
  async getJobReviews(jobId, params = {}) {
    const { data } = await api.get(`/jobs/${encodeURIComponent(jobId)}/reviews`, { params: cleanParams(params) });
    return data;
  },
  async getProviderReviews(params = {}) {
    const { data } = await api.get("/jobProviders/reviews", { params: cleanParams(params) });
    return data;
  },
  async getAdminReviews(params = {}) {
    const { data } = await api.get("/admin/reviews", { params: cleanParams(params) });
    return data;
  },
  async deleteReviewAsAdmin(id) {
    const { data } = await api.delete(`/admin/reviews/${encodeURIComponent(id)}`);
    return data;
  }
};
