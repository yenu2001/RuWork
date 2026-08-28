import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { messageService } from "../../services/messageService";
import { notificationService } from "../../services/notificationService";
import { COMMUNICATION_UNREAD_EVENT } from "../../utils/communication";
import Button from "../common/Button";
import Logo from "../common/Logo";

const roleLinks = {
  student: [
    { label: "Dashboard", to: "/student/dashboard" },
    { label: "Find Jobs", to: "/jobs" },
    { label: "My Applications", to: "/student/applications" },
    { label: "Job History", to: "/student/job-history" },
    { label: "Messages", to: "/student/messages", badge: "messages" },
    { label: "Notifications", to: "/student/notifications", badge: "notifications" },
    { label: "Profile", to: "/student/profile" }
  ],
  Job_Provider: [
    { label: "Dashboard", to: "/provider/dashboard" },
    { label: "Post a Job", to: "/provider/jobs/new" },
    { label: "My Jobs", to: "/provider/jobs" },
    { label: "Messages", to: "/provider/messages", badge: "messages" },
    { label: "Notifications", to: "/provider/notifications", badge: "notifications" },
    { label: "Reviews", to: "/provider/reviews" },
    { label: "Company Profile", to: "/provider/profile" }
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Registration Reviews", to: "/admin/registrations" },
    { label: "Students", to: "/admin/students" },
    { label: "Job Providers", to: "/admin/providers" },
    { label: "Jobs", to: "/admin/jobs" },
    { label: "Reviews", to: "/admin/reviews" },
    { label: "Settings", to: "/admin/settings" }
  ]
};

export default function AppHeader() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState({ messages: 0, notifications: 0 });
  const links = auth.isAuthenticated ? roleLinks[auth.user.role] || [] : [
    { label: "Home", to: "/" },
    { label: "Find Jobs", to: "/jobs" }
  ];

  useEffect(() => {
    if (import.meta.env.MODE === "test" || !auth.isAuthenticated || !["student", "Job_Provider"].includes(auth.user?.role)) return undefined;
    let active = true;
    function loadUnread() {
      Promise.allSettled([messageService.getUnreadCount(), notificationService.getUnreadCount()]).then(([messages, notifications]) => {
        if (!active) return;
        setUnread({
          messages: messages.status === "fulfilled" ? messages.value : 0,
          notifications: notifications.status === "fulfilled" ? notifications.value : 0
        });
      });
    }
    loadUnread();
    window.addEventListener(COMMUNICATION_UNREAD_EVENT, loadUnread);
    return () => {
      active = false;
      window.removeEventListener(COMMUNICATION_UNREAD_EVENT, loadUnread);
    };
  }, [auth.isAuthenticated, auth.user?.role]);

  function linkContent(link) {
    const count = link.badge ? unread[link.badge] : 0;
    return <>{link.label}<UnreadBadge count={count} label={link.label} /></>;
  }

  function logout() {
    auth.logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
      <div className="page-container flex min-h-18 items-center justify-between gap-5">
        <Logo />
        <nav className={`hidden items-center md:flex ${auth.user?.role === "admin" ? "gap-3 xl:gap-5" : "gap-7"}`} aria-label="Application navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `${auth.user?.role === "admin" ? "text-xs lg:text-sm" : "text-sm"} whitespace-nowrap font-semibold transition ${isActive ? "text-brand-700" : "text-ink-600 hover:text-brand-700"}`}>
              {linkContent(link)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">
          {auth.isAuthenticated ? (
            <Button variant="secondary" onClick={logout}><LogOut className="size-4" aria-hidden="true" /> Log out</Button>
          ) : (
            <Button as={Link} to="/login/student">Log in</Button>
          )}
        </div>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} className="grid size-11 place-items-center rounded-xl text-ink-800 hover:bg-slate-100 md:hidden" aria-label="Toggle application navigation" aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </div>
      {mobileOpen && (
        <nav className="border-t border-slate-200 bg-white px-5 py-4 md:hidden" aria-label="Mobile application navigation">
          <div className="mx-auto grid max-w-lg gap-2">
            {links.map((link) => <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-ink-800 hover:bg-brand-50 hover:text-brand-700">{linkContent(link)}</Link>)}
            <div className="mt-2 border-t border-slate-200 pt-4">
              {auth.isAuthenticated ? <Button variant="secondary" onClick={logout} className="w-full">Log out</Button> : <Button as={Link} to="/login/student" className="w-full">Log in</Button>}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

export function UnreadBadge({ count, label }) {
  return count > 0 ? <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white" aria-label={`${count} unread ${label.toLowerCase()}`}>{count > 99 ? "99+" : count}</span> : null;
}
