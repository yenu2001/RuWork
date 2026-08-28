import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import Button from "../common/Button";
import Logo from "../common/Logo";
import RoleSelectionModal from "../auth/RoleSelectionModal";

const navItems = [
  { label: "Home", to: "/" },
  { label: "For Students", to: "/#students" },
  { label: "For Providers", to: "/#providers" },
  { label: "How it works", to: "/#how-it-works" }
];

export default function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="page-container flex min-h-18 items-center justify-between gap-5">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to} className="text-sm font-semibold text-ink-600 transition hover:text-brand-700">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="secondary" onClick={() => setModalMode("login")}>Log in</Button>
            <Button onClick={() => setModalMode("register")}>Create Account</Button>
          </div>
          <button type="button" onClick={() => setMobileOpen((open) => !open)} className="grid size-11 place-items-center rounded-xl text-ink-800 hover:bg-slate-100 sm:hidden" aria-label="Toggle navigation" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="border-t border-slate-200 bg-white px-5 py-5 sm:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-lg gap-2">
              {navItems.map((item) => (
                <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-ink-800 hover:bg-brand-50 hover:text-brand-700">
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
                <Button variant="secondary" onClick={() => { setModalMode("login"); setMobileOpen(false); }}>Log in</Button>
                <Button onClick={() => { setModalMode("register"); setMobileOpen(false); }}>Create Account</Button>
              </div>
            </div>
          </nav>
        )}
      </header>
      <RoleSelectionModal mode={modalMode || "login"} isOpen={Boolean(modalMode)} onClose={() => setModalMode(null)} onSwitchMode={() => setModalMode((mode) => mode === "login" ? "register" : "login")} />
    </>
  );
}
