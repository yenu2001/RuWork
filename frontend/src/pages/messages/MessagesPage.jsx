import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import TextareaField from "../../components/common/TextareaField";
import AppHeader from "../../components/layout/AppHeader";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { messageService } from "../../services/messageService";
import { getApiError } from "../../utils/apiError";
import { formatCommunicationTime, notifyUnreadCountsChanged } from "../../utils/communication";

function roleBase(role) {
  return role === "student" ? "/student/messages" : "/provider/messages";
}

function ConversationList({ conversations, activeId, onOpen }) {
  if (!conversations.length) return <div className="p-7 text-center text-sm text-ink-600"><MessageCircle className="mx-auto size-8 text-brand-500" aria-hidden="true" /><p className="mt-3 font-bold text-ink-900">No conversations yet</p><p className="mt-1">Open an Application to message the other party.</p></div>;
  return <div className="divide-y divide-slate-200">{conversations.map((conversation) => <button key={conversation.applicationId} type="button" onClick={() => onOpen(conversation.applicationId)} className={`w-full p-5 text-left transition hover:bg-brand-50 ${activeId === conversation.applicationId ? "bg-brand-50" : "bg-white"}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-extrabold text-ink-950">{conversation.otherParticipant.displayName}</p><p className="mt-1 truncate text-sm font-semibold text-brand-700">{conversation.job.jobTitle}</p></div>{conversation.unreadCount > 0 ? <span className="shrink-0 rounded-full bg-brand-600 px-2 py-1 text-xs font-extrabold text-white" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span> : null}</div>
    <p className={`mt-3 truncate text-sm ${conversation.unreadCount > 0 ? "font-bold text-ink-900" : "text-ink-600"}`}>{conversation.latestMessage.content}</p><p className="mt-2 text-xs text-ink-500">{formatCommunicationTime(conversation.latestMessage.createdAt)}</p>
  </button>)}</div>;
}

function MessageBubble({ message }) {
  return <article className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${message.isOwn ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-800"}`}>
    <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
    {message.sharedContactNumber ? <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${message.isOwn ? "bg-white/15" : "bg-brand-50 text-brand-800"}`}>Shared contact number: {message.sharedContactNumber}</p> : null}
    <p className={`mt-2 text-xs ${message.isOwn ? "text-white/75" : "text-ink-500"}`}>{formatCommunicationTime(message.createdAt)}{message.isOwn && message.isRead ? " · Read" : ""}</p>
  </div></article>;
}

export default function MessagesPage() {
  const { applicationId } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const base = roleBase(auth.user.role);
  const [conversationPage, setConversationPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [inbox, setInbox] = useState({ status: "loading", conversations: [], pagination: null, error: "" });
  const [thread, setThread] = useState({ status: applicationId ? "loading" : "idle", conversation: null, messages: [], pagination: null, error: "" });
  const [content, setContent] = useState("");
  const [includeContactNumber, setIncludeContactNumber] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    messageService.getConversations({ page: conversationPage, limit: 20 })
      .then((data) => active && setInbox({ status: "success", conversations: data.conversations, pagination: data.pagination, error: "" }))
      .catch((error) => active && setInbox({ status: "error", conversations: [], pagination: null, error: getApiError(error).message }));
    return () => { active = false; };
  }, [conversationPage, refreshKey]);

  useEffect(() => {
    if (!applicationId) {
      setThread({ status: "idle", conversation: null, messages: [], pagination: null, error: "" });
      return undefined;
    }
    let active = true;
    setThread((current) => ({ ...current, status: "loading", error: "" }));
    messageService.getConversation(applicationId, { page: historyPage, limit: 30 })
      .then((data) => {
        if (!active) return;
        setThread({ status: "success", conversation: data.conversation, messages: data.messages, pagination: data.pagination, error: "" });
        notifyUnreadCountsChanged();
      })
      .catch((error) => active && setThread({ status: "error", conversation: null, messages: [], pagination: null, error: getApiError(error).message }));
    return () => { active = false; };
  }, [applicationId, historyPage, refreshKey]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!content.trim() || !applicationId) return;
    setSending(true);
    try {
      const data = await messageService.sendMessage({ applicationId, content, includeContactNumber: auth.user.role === "student" && includeContactNumber });
      setContent("");
      setIncludeContactNumber(false);
      setHistoryPage(1);
      setRefreshKey((value) => value + 1);
      showToast(data.message, "success");
    } catch (error) {
      setThread((current) => ({ ...current, error: getApiError(error).message }));
    } finally {
      setSending(false);
    }
  }

  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-8 sm:py-12">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow"><MessageCircle className="size-3.5" aria-hidden="true" />Workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Messages</h1><p className="mt-3 text-ink-600">Application-based conversations between Students and Job Providers.</p></div><Button variant="secondary" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw className="size-4" aria-hidden="true" />Refresh</Button></div>
    <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className={`surface-card min-w-0 overflow-hidden ${applicationId ? "hidden lg:block" : "block"}`} aria-label="Conversation list"><h2 className="border-b border-slate-200 px-5 py-4 font-extrabold text-ink-950">Inbox</h2>{inbox.status === "loading" ? <Spinner label="Loading conversations…" /> : null}{inbox.status === "error" ? <div className="p-5"><Alert>{inbox.error}</Alert></div> : null}{inbox.status === "success" ? <ConversationList conversations={inbox.conversations} activeId={applicationId} onOpen={(id) => { setHistoryPage(1); navigate(`${base}/${id}`); }} /> : null}{inbox.pagination?.pages > 1 ? <div className="flex items-center justify-between border-t border-slate-200 p-4"><Button variant="secondary" disabled={conversationPage <= 1} onClick={() => setConversationPage((value) => value - 1)}>Previous</Button><span className="text-xs font-bold text-ink-600">{conversationPage}/{inbox.pagination.pages}</span><Button variant="secondary" disabled={conversationPage >= inbox.pagination.pages} onClick={() => setConversationPage((value) => value + 1)}>Next</Button></div> : null}</section>
      <section className={`${applicationId ? "block" : "hidden lg:block"} min-w-0`} aria-label="Active conversation">
        {!applicationId ? <div className="surface-card grid min-h-80 place-items-center p-8 text-center"><div><MessageCircle className="mx-auto size-10 text-brand-500" aria-hidden="true" /><h2 className="mt-4 text-xl font-extrabold text-ink-950">Select a conversation</h2><p className="mt-2 text-sm text-ink-600">Choose an Application conversation from your inbox.</p></div></div> : null}
        {applicationId ? <><Button variant="secondary" className="mb-4 lg:hidden" onClick={() => navigate(base)}><ArrowLeft className="size-4" aria-hidden="true" />Back to inbox</Button>{thread.status === "loading" ? <div className="surface-card"><Spinner label="Loading Message history…" /></div> : null}{thread.status === "error" ? <div className="surface-card p-5"><Alert>{thread.error}</Alert></div> : null}{thread.status === "success" ? <div className="surface-card min-w-0 overflow-hidden"><header className="border-b border-slate-200 p-5 sm:p-6"><h2 className="text-xl font-extrabold text-ink-950">{auth.user.role === "student" ? thread.conversation.provider.displayName : thread.conversation.student.displayName}</h2><p className="mt-1 text-sm font-semibold text-brand-700">{thread.conversation.job.jobTitle}{thread.conversation.job.isArchived ? " · Archived Job" : ""}</p></header>
          <div className="grid max-h-[520px] gap-4 overflow-y-auto bg-slate-50 p-4 sm:p-6" aria-live="polite">{thread.messages.length ? thread.messages.map((message) => <MessageBubble key={message.id} message={message} />) : <p className="py-10 text-center text-sm text-ink-600">No Messages yet. Start this Application conversation below.</p>}</div>
          {thread.pagination?.pages > 1 ? <nav className="flex items-center justify-center gap-3 border-t border-slate-200 p-3" aria-label="Message history pagination"><Button variant="secondary" disabled={historyPage >= thread.pagination.pages} onClick={() => setHistoryPage((value) => value + 1)}>Older</Button><span className="text-xs font-bold text-ink-600">Page {historyPage}</span><Button variant="secondary" disabled={historyPage <= 1} onClick={() => setHistoryPage((value) => value - 1)}>Newer</Button></nav> : null}
          <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 sm:p-6"><TextareaField id="message-content" label="Message" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} required helper={`${content.length}/2000 characters. Messages are plain text.`} />{auth.user.role === "student" ? <label className="mt-4 flex items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm text-ink-700"><input type="checkbox" checked={includeContactNumber} onChange={(event) => setIncludeContactNumber(event.target.checked)} className="mt-0.5 size-4 accent-indigo-600" /><span><strong>Include my contact number</strong><br />Your authenticated profile number will be shared with this Job Provider.</span></label> : null}<div className="mt-4 flex justify-end"><Button type="submit" disabled={!content.trim()} isLoading={sending}><Send className="size-4" aria-hidden="true" />Send Message</Button></div></form>
        </div> : null}</> : null}
      </section>
    </div>
  </main></div>;
}
