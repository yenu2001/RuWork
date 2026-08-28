import api from "./api";

export const profileService = {
  async getStudentProfile() {
    const { data } = await api.get("/users/profile");
    return data.profile;
  },
  async updateStudentProfile(payload) {
    const { data } = await api.patch("/users/profile", payload);
    return data;
  },
  async getProviderProfile() {
    const { data } = await api.get("/jobProviders/profile");
    return data.profile;
  },
  async updateProviderProfile(payload) {
    const { data } = await api.patch("/jobProviders/profile", payload);
    return data;
  }
};
