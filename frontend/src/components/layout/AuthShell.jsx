import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../common/Logo";

export default function AuthShell({ eyebrow, title, description, children, admin = false, wide = false }) {
  return (
    <main className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(560px,1.1fr)]">
      <aside className={`relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between ${admin ? "bg-ink-950" : "bg-brand-700"}`}>
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -top-24 -right-28 size-80 rounded-full border border-white/30" />
          <div className="absolute top-48 -right-10 size-48 rounded-full bg-brand-400/50 blur-3xl" />
          <div className="absolute bottom-16 -left-24 size-72 rounded-full border border-white/20" />
        </div>
        <Logo className="relative [&_span:last-child]:text-white" />
        <div className="relative max-w-md">
          <p className="text-xs font-extrabold tracking-[0.18em] text-brand-200 uppercase">{admin ? "Secure administration" : "Work that fits university life"}</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em]">{admin ? "Manage trust across the RuWork community." : "Build experience. Earn flexibly. Stay focused on your future."}</h2>
          <ul className="mt-8 grid gap-4 text-sm text-white/85">
            {(admin ? ["Protected role-based access", "Private Admin accounts only", "Backend authorization remains authoritative"] : ["Verified University of Ruhuna students", "Reviewed job-provider registrations", "Simple, guided account verification"]).map((item) => (
              <li key={item} className="flex items-center gap-3"><CheckCircle2 className="size-5 text-brand-200" aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">RuWork public and authentication foundation</p>
      </aside>
      <section className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Logo className="lg:hidden" />
          <Link to="/" className="ml-auto inline-flex items-center gap-2 rounded-lg text-sm font-bold text-ink-600 hover:text-brand-700">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to home
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
            <p className="text-xs font-extrabold tracking-[0.16em] text-brand-600 uppercase">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600 sm:text-base">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
