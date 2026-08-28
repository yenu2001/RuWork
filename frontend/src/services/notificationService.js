import api from "./api";

const cleanParams = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));

export const notificationService = {
  async getNotifications(params = {}) {
    const { data } = await api.get("/notifications", { params: cleanParams(params) });
    return data;
  },
  async markRead(id) {
    const { data } = await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
    return data.notification;
  },
  async markAllRead() {
    const { data } = await api.patch("/notifications/read-all");
    return data;
  },
  async getUnreadCount() {
    const { data } = await api.get("/notifications/unread-count");
    return data.unreadCount;
  }
};
