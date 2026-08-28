export function formatCommunicationTime(value) {
  if (!value) return "Unknown time";
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const notificationLabels = {
  NEW_APPLICATION: "New Application",
  APPLICATION_ACCEPTED: "Application accepted",
  APPLICATION_DECLINED: "Application declined",
  APPLICATION_WITHDRAWN: "Application withdrawn",
  APPLICATION_CANCELLED: "Engagement cancelled",
  APPLICATION_COMPLETED: "Work completed",
  NEW_MESSAGE: "New Message"
};

export const COMMUNICATION_UNREAD_EVENT = "ruwork:communication-unread-changed";

export function notifyUnreadCountsChanged() {
  window.dispatchEvent(new Event(COMMUNICATION_UNREAD_EVENT));
}

export function notificationDestination(notification, role) {
  const applicationId = notification.relatedApplicationId;
  if (!applicationId) return null;
  if (notification.type === "NEW_MESSAGE") {
    return role === "student" ? `/student/messages/${applicationId}` : `/provider/messages/${applicationId}`;
  }
  if (role === "student" && ["APPLICATION_ACCEPTED", "APPLICATION_DECLINED", "APPLICATION_COMPLETED"].includes(notification.type)) {
    return `/student/applications/${applicationId}`;
  }
  if (role === "Job_Provider" && ["NEW_APPLICATION", "APPLICATION_WITHDRAWN", "APPLICATION_CANCELLED"].includes(notification.type)) {
    return `/provider/applications/${applicationId}`;
  }
  return null;
}
