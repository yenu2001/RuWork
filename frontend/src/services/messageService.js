import api from "./api";

const cleanParams = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));

export const messageService = {
  async getConversations(params = {}) {
    const { data } = await api.get("/messages/conversations", { params: cleanParams(params) });
    return data;
  },
  async getConversation(applicationId, params = {}) {
    const { data } = await api.get(`/messages/conversations/${encodeURIComponent(applicationId)}`, { params: cleanParams(params) });
    return data;
  },
  async sendMessage(payload) {
    const { data } = await api.post("/messages", payload);
    return data;
  },
  async getUnreadCount() {
    const { data } = await api.get("/messages/unread-count");
    return data.unreadCount;
  }
};
