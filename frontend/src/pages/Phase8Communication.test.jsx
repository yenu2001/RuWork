import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnreadBadge } from "../components/layout/AppHeader";
import { messageService } from "../services/messageService";
import { notificationService } from "../services/notificationService";
import MessagesPage from "./messages/MessagesPage";
import NotificationsPage from "./notifications/NotificationsPage";

const authState = vi.hoisted(() => ({ role: "student" }));
const showToast = vi.hoisted(() => vi.fn());

vi.mock("../components/layout/AppHeader", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: () => <header>RuWork navigation</header> };
});
vi.mock("../hooks/useAuth", () => ({
  default: () => ({ isAuthenticated: true, user: { role: authState.role } })
}));
vi.mock("../hooks/useToast", () => ({ default: () => ({ showToast }) }));
vi.mock("../services/messageService", () => ({
  messageService: {
    getConversations: vi.fn(), getConversation: vi.fn(), sendMessage: vi.fn(), getUnreadCount: vi.fn()
  }
}));
vi.mock("../services/notificationService", () => ({
  notificationService: {
    getNotifications: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), getUnreadCount: vi.fn()
  }
}));

const timestamp = "2026-08-28T08:30:00.000Z";
const conversation = {
  applicationId: "application-1",
  job: { id: "job-1", jobTitle: "Research Assistant", isArchived: false },
  otherParticipant: { displayName: "Current Company" },
  latestMessage: { content: "Can we discuss the schedule?", createdAt: timestamp },
  unreadCount: 2
};
const thread = {
  conversation: {
    applicationId: "application-1",
    job: conversation.job,
    student: { displayName: "Ruhuna Student" },
    provider: { displayName: "Current Company" }
  },
  messages: [
    { id: "message-1", content: "Welcome to the project.", createdAt: timestamp, isOwn: false, isRead: true },
    { id: "message-2", content: "Thank you!", createdAt: timestamp, isOwn: true, isRead: true }
  ],
  pagination: { page: 1, pages: 1, total: 2 }
};
const notification = {
  id: "notification-1", type: "NEW_MESSAGE", message: "Current Company sent you a Message.",
  relatedApplicationId: "application-1", relatedJobId: "job-1", isRead: false, createdAt: timestamp
};

function inboxRoute(path = "/student/messages") {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/student/messages" element={<MessagesPage />} />
    <Route path="/student/messages/:applicationId" element={<MessagesPage />} />
    <Route path="/provider/messages" element={<MessagesPage />} />
    <Route path="/provider/messages/:applicationId" element={<MessagesPage />} />
  </Routes></MemoryRouter>);
}

function notificationsRoute(path = "/student/notifications") {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/student/notifications" element={<NotificationsPage />} />
    <Route path="/provider/notifications" element={<NotificationsPage />} />
    <Route path="/student/messages/:applicationId" element={<p>Student Message destination</p>} />
    <Route path="/provider/applications/:applicationId" element={<p>Provider Application destination</p>} />
  </Routes></MemoryRouter>);
}

describe("Phase 8 communication", () => {
  beforeEach(() => {
    authState.role = "student";
    messageService.getConversations.mockResolvedValue({ conversations: [conversation], pagination: { page: 1, pages: 1, total: 1 } });
    messageService.getConversation.mockResolvedValue(thread);
    messageService.sendMessage.mockResolvedValue({ message: "Message sent successfully" });
    notificationService.getNotifications.mockResolvedValue({ notifications: [notification], pagination: { page: 1, pages: 1, total: 1 } });
    notificationService.markRead.mockResolvedValue({ ...notification, isRead: true });
    notificationService.markAllRead.mockResolvedValue({ message: "All Notifications marked as read" });
  });

  it("loads the Student inbox with safe summaries and a semantic unread count", async () => {
    inboxRoute();
    expect(await screen.findByText("Current Company")).toBeInTheDocument();
    expect(screen.getByText("Research Assistant")).toBeInTheDocument();
    expect(screen.getByLabelText("2 unread messages")).toBeInTheDocument();
    expect(messageService.getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("loads the same bounded inbox for a Job Provider", async () => {
    authState.role = "Job_Provider";
    inboxRoute("/provider/messages");
    expect(await screen.findByText("Current Company")).toBeInTheDocument();
    expect(messageService.getConversations).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("opens chronological Message history and displays read state", async () => {
    inboxRoute("/student/messages/application-1");
    expect(await screen.findByText("Welcome to the project.")).toBeInTheDocument();
    expect(screen.getByText(/Thank you!/)).toBeInTheDocument();
    expect(screen.getByText(/Read$/)).toBeInTheDocument();
    expect(messageService.getConversation).toHaveBeenCalledWith("application-1", { page: 1, limit: 30 });
  });

  it("lets a Student explicitly share only their authenticated contact with a Message", async () => {
    inboxRoute("/student/messages/application-1");
    await screen.findByText("Welcome to the project.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "I am available tomorrow." } });
    fireEvent.click(screen.getByRole("checkbox", { name: /include my contact number/i }));
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
    await waitFor(() => expect(messageService.sendMessage).toHaveBeenCalledWith({ applicationId: "application-1", content: "I am available tomorrow.", includeContactNumber: true }));
    expect(showToast).toHaveBeenCalledWith("Message sent successfully", "success");
  });

  it("does not offer contact-number sharing to a Job Provider", async () => {
    authState.role = "Job_Provider";
    inboxRoute("/provider/messages/application-1");
    await screen.findByText("Welcome to the project.");
    expect(screen.queryByRole("checkbox", { name: /include my contact number/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Please confirm." } });
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
    await waitFor(() => expect(messageService.sendMessage).toHaveBeenCalledWith({ applicationId: "application-1", content: "Please confirm.", includeContactNumber: false }));
  });

  it("keeps the inbox/thread layout responsive without fixed-width content", async () => {
    inboxRoute("/student/messages/application-1");
    const active = await screen.findByLabelText("Active conversation");
    expect(active).toHaveClass("min-w-0");
    expect(screen.getByLabelText("Conversation list")).toHaveClass("hidden", "lg:block");
    expect(screen.getByRole("button", { name: /back to inbox/i })).toHaveClass("lg:hidden");
  });

  it("shows a useful empty inbox state", async () => {
    messageService.getConversations.mockResolvedValue({ conversations: [], pagination: { page: 1, pages: 0, total: 0 } });
    inboxRoute();
    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
  });

  it("shows a Message loading state while the bounded inbox request is pending", () => {
    messageService.getConversations.mockReturnValue(new Promise(() => {}));
    inboxRoute();
    expect(screen.getByText("Loading conversations…")).toBeInTheDocument();
  });

  it("shows a safe Message error state", async () => {
    messageService.getConversations.mockRejectedValue(new Error("Conversation service unavailable."));
    inboxRoute();
    expect(await screen.findByRole("alert")).toHaveTextContent("Conversation service unavailable.");
  });

  it("renders Student Notifications using friendly labels and non-color read state", async () => {
    notificationsRoute();
    expect(await screen.findByText("New Message")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.queryByText("NEW_MESSAGE")).not.toBeInTheDocument();
  });

  it("shows useful Notification empty and error states", async () => {
    notificationService.getNotifications.mockResolvedValue({ notifications: [], pagination: { page: 1, pages: 0, total: 0 } });
    const view = notificationsRoute();
    expect(await screen.findByText("No Notifications")).toBeInTheDocument();
    view.unmount();

    notificationService.getNotifications.mockRejectedValue(new Error("Notification service unavailable."));
    notificationsRoute();
    expect(await screen.findByRole("alert")).toHaveTextContent("Notification service unavailable.");
  });

  it("marks an unread Notification and navigates only to its validated Student destination", async () => {
    notificationsRoute();
    fireEvent.click(await screen.findByRole("button", { name: /Unread: New Message/i }));
    await waitFor(() => expect(notificationService.markRead).toHaveBeenCalledWith("notification-1"));
    expect(await screen.findByText("Student Message destination")).toBeInTheDocument();
  });

  it("navigates a Provider lifecycle Notification to the related Application", async () => {
    authState.role = "Job_Provider";
    const providerNotification = { ...notification, type: "NEW_APPLICATION", message: "A Student applied to Research Assistant." };
    notificationService.getNotifications.mockResolvedValue({ notifications: [providerNotification], pagination: { page: 1, pages: 1, total: 1 } });
    notificationService.markRead.mockResolvedValue({ ...providerNotification, isRead: true });
    notificationsRoute("/provider/notifications");
    fireEvent.click(await screen.findByRole("button", { name: /Unread: New Application/i }));
    expect(await screen.findByText("Provider Application destination")).toBeInTheDocument();
  });

  it("supports unread-only filtering and mark-all-read", async () => {
    notificationsRoute();
    await screen.findByText("New Message");
    fireEvent.click(screen.getByRole("checkbox", { name: "Show unread only" }));
    await waitFor(() => expect(notificationService.getNotifications).toHaveBeenLastCalledWith({ page: 1, limit: 20, unreadOnly: true }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => expect(notificationService.markAllRead).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith("All Notifications marked as read", "success");
  });

  it("shows and caps real unread badges while omitting zero counts", () => {
    const { rerender } = render(<UnreadBadge count={3} label="Messages" />);
    expect(screen.getByLabelText("3 unread messages")).toHaveTextContent("3");
    rerender(<UnreadBadge count={120} label="Notifications" />);
    expect(screen.getByLabelText("120 unread notifications")).toHaveTextContent("99+");
    rerender(<UnreadBadge count={0} label="Messages" />);
    expect(screen.queryByLabelText(/unread messages/)).not.toBeInTheDocument();
  });
});
