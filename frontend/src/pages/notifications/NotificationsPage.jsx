import { useEffect, useState } from "react";
import { Bell, CheckCheck, MessageCircle, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { notificationService } from "../../services/notificationService";
import { getApiError } from "../../utils/apiError";
import { formatCommunicationTime, notificationDestination, notificationLabels, notifyUnreadCountsChanged } from "../../utils/communication";

export default function NotificationsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", notifications: [], pagination: null, error: "", updating: false });

  useEffect(() => {
    let active = true;
    notificationService.getNotifications({ page, limit: 20, unreadOnly: unreadOnly || undefined })
      .then((data) => active && setState({ status: "success", notifications: data.notifications, pagination: data.pagination, error: "", updating: false }))
      .catch((error) => active && setState({ status: "error", notifications: [], pagination: null, error: getApiError(error).message, updating: false }));
    return () => { active = false; };
  }, [page, unreadOnly, refreshKey]);

  async function openNotification(notification) {
    let next = notification;
    if (!notification.isRead) {
      try {
        next = await notificationService.markRead(notification.id);
        setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === next.id ? next : item) }));
        notifyUnreadCountsChanged();
      } catch (error) {
        setState((current) => ({ ...current, error: getApiError(error).message }));
        return;
      }
    }
    const destination = notificationDestination(next, auth.user.role);
    if (destination) navigate(destination);
  }

  async function markAllRead() {
    setState((current) => ({ ...current, updating: true, error: "" }));
    try {
      const data = await notificationService.markAllRead();
      showToast(data.message, "success");
      notifyUnreadCountsChanged();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setState((current) => ({ ...current, updating: false, error: getApiError(error).message }));
    }
  }

  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-8 sm:py-12">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow"><Bell className="size-3.5" aria-hidden="true" />Workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Notifications</h1><p className="mt-3 text-ink-600">Application and Message updates for your RuWork account.</p></div><Button variant="secondary" onClick={markAllRead} isLoading={state.updating}><CheckCheck className="size-4" aria-hidden="true" />Mark all read</Button></div>
    <label className="surface-card mt-8 flex w-fit items-center gap-3 px-4 py-3 text-sm font-bold text-ink-800"><input type="checkbox" checked={unreadOnly} onChange={(event) => { setPage(1); setUnreadOnly(event.target.checked); }} className="size-4 accent-indigo-600" />Show unread only</label>
    {state.error ? <div className="mt-5"><Alert>{state.error}</Alert></div> : null}
    {state.status === "loading" ? <Spinner label="Loading Notifications…" /> : null}
    {state.status === "success" && !state.notifications.length ? <div className="surface-card mt-6 p-10 text-center"><Bell className="mx-auto size-9 text-brand-500" aria-hidden="true" /><h2 className="mt-4 text-xl font-extrabold text-ink-950">No Notifications</h2><p className="mt-2 text-sm text-ink-600">Important Application and Message updates will appear here.</p></div> : null}
    {state.status === "success" && state.notifications.length ? <div className="mt-6 grid gap-3">{state.notifications.map((notification) => {
      const Icon = notification.type === "NEW_MESSAGE" ? MessageCircle : UserCheck;
      const destination = notificationDestination(notification, auth.user.role);
      return <button key={notification.id} type="button" onClick={() => openNotification(notification)} disabled={!destination} className={`surface-card flex w-full items-start gap-4 p-5 text-left transition hover:border-brand-300 ${notification.isRead ? "opacity-80" : "border-l-4 border-l-brand-600"}`} aria-label={`${notification.isRead ? "Read" : "Unread"}: ${notificationLabels[notification.type] || "Notification"}. ${notification.message}`}>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${notification.isRead ? "bg-slate-100 text-ink-500" : "bg-brand-50 text-brand-700"}`}><Icon className="size-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-ink-950">{notificationLabels[notification.type] || "RuWork update"}</strong>{!notification.isRead ? <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-extrabold text-brand-800">Unread</span> : <span className="text-xs font-semibold text-ink-500">Read</span>}</span><span className="mt-2 block leading-6 text-ink-700">{notification.message}</span><span className="mt-2 block text-xs text-ink-500">{formatCommunicationTime(notification.createdAt)}</span></span>
      </button>;
    })}</div> : null}
    {state.pagination?.pages > 1 ? <nav className="mt-8 flex justify-center gap-3" aria-label="Notifications pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="self-center text-sm font-bold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav> : null}
  </main></div>;
}
