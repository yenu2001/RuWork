import { useState } from "react";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check, Clock3, GraduationCap, ShieldCheck, Sparkles, Star } from "lucide-react";
import Button from "../../components/common/Button";
import RoleSelectionModal from "../../components/auth/RoleSelectionModal";
import PublicHeader from "../../components/layout/PublicHeader";
import PublicFooter from "../../components/layout/PublicFooter";

const steps = [
  { number: "01", title: "Create a verified profile", text: "Register as a University of Ruhuna student or a trusted job provider." },
  { number: "02", title: "Complete account review", text: "Verify your email, then wait for RuWork Admin approval before access." },
  { number: "03", title: "Start connecting", text: "Approved accounts can move into the RuWork experience as future phases arrive." }
];

export default function LandingPage() {
  const [modalMode, setModalMode] = useState(null);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#fff_0%,#faf9ff_100%)]">
          <div className="absolute top-24 left-[47%] size-72 rounded-full bg-brand-100/60 blur-3xl" aria-hidden="true" />
          <div className="page-container relative grid min-h-[680px] items-center gap-14 py-16 lg:grid-cols-[1.03fr_0.97fr] lg:py-20">
            <div className="max-w-2xl">
              <span className="eyebrow"><Sparkles className="size-3.5" aria-hidden="true" /> Built for University of Ruhuna</span>
              <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-ink-950 sm:text-6xl lg:text-7xl">
                Flexible work.<br /><span className="text-brand-600">Real experience.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-ink-600">
                RuWork connects University of Ruhuna students with trusted part-time opportunities that work around university life.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => setModalMode("register")} className="min-h-13 px-7 text-base">Get Started <ArrowRight className="size-4" aria-hidden="true" /></Button>
                <Button variant="secondary" onClick={() => setModalMode("login")} className="min-h-13 px-7 text-base">Find Jobs</Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink-600">
                <span className="inline-flex items-center gap-2"><BadgeCheck className="size-5 text-brand-600" aria-hidden="true" /> Verified student access</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="size-5 text-brand-600" aria-hidden="true" /> Reviewed providers</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[530px]" aria-label="Preview of the RuWork opportunity experience">
              <div className="absolute -top-8 -right-4 size-28 rounded-3xl bg-brand-200/60 rotate-12" aria-hidden="true" />
              <div className="surface-card relative overflow-hidden p-5 sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-brand-600 uppercase">Opportunity preview</p>
                    <h2 className="mt-1 text-xl font-extrabold text-ink-950">Work that fits your week</h2>
                  </div>
                  <div className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600"><BriefcaseBusiness className="size-5" aria-hidden="true" /></div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { title: "Social media assistant", company: "Local creative studio", mode: "Flexible", tone: "bg-violet-100 text-violet-700" },
                    { title: "Weekend event support", company: "Matara events team", mode: "On-site", tone: "bg-blue-100 text-blue-700" },
                    { title: "Data entry assistant", company: "Education services", mode: "Remote", tone: "bg-emerald-100 text-emerald-700" }
                  ].map((job, index) => (
                    <div key={job.title} className={`rounded-2xl border p-4 transition ${index === 0 ? "border-brand-200 bg-brand-50/60" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-extrabold text-brand-700 shadow-sm">{job.title.charAt(0)}</span>
                          <div><p className="font-bold text-ink-950">{job.title}</p><p className="mt-1 text-xs text-ink-600">{job.company}</p></div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${job.tone}`}>{job.mode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -right-3 -bottom-7 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft sm:-right-8">
                <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-500"><Star className="size-5 fill-current" aria-hidden="true" /></div>
                <div><p className="text-sm font-extrabold text-ink-950">Build your profile</p><p className="text-xs text-ink-600">Experience beyond the classroom</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-8">
          <div className="page-container grid gap-6 text-center sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
            <div><p className="text-2xl font-extrabold text-ink-950">Verified</p><p className="mt-1 text-sm text-ink-600">University student identity</p></div>
            <div><p className="text-2xl font-extrabold text-ink-950">Reviewed</p><p className="mt-1 text-sm text-ink-600">Provider registrations</p></div>
            <div><p className="text-2xl font-extrabold text-ink-950">Flexible</p><p className="mt-1 text-sm text-ink-600">Part-time opportunity focus</p></div>
          </div>
        </section>

        <section className="py-20 sm:py-24" id="students">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Choose your path</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-ink-950 sm:text-4xl">One community, two ways to grow</h2>
              <p className="mt-4 leading-7 text-ink-600">Whether you are building experience or looking for student talent, RuWork gives you a clear, verified starting point.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <article className="surface-card relative overflow-hidden p-7 sm:p-9">
                <div className="absolute top-0 right-0 size-40 rounded-bl-[100%] bg-brand-50" aria-hidden="true" />
                <span className="relative grid size-12 place-items-center rounded-2xl bg-brand-600 text-white"><GraduationCap className="size-6" aria-hidden="true" /></span>
                <h3 className="relative mt-6 text-2xl font-extrabold text-ink-950">Join as a Student</h3>
                <p className="relative mt-3 max-w-md leading-7 text-ink-600">Create a verified University of Ruhuna profile ready for flexible part-time work.</p>
                <ul className="relative mt-6 grid gap-3 text-sm text-ink-800">
                  {["Official university email verification", "Academic profile information", "Admin-reviewed access"].map((item) => <li key={item} className="flex items-center gap-3"><Check className="size-4 text-brand-600" aria-hidden="true" />{item}</li>)}
                </ul>
                <Button className="relative mt-8" onClick={() => setModalMode("register")}>Create student account <ArrowRight className="size-4" aria-hidden="true" /></Button>
              </article>
              <article className="surface-card relative overflow-hidden p-7 sm:p-9" id="providers">
                <div className="absolute top-0 right-0 size-40 rounded-bl-[100%] bg-blue-50" aria-hidden="true" />
                <span className="relative grid size-12 place-items-center rounded-2xl bg-ink-950 text-white"><Building2 className="size-6" aria-hidden="true" /></span>
                <h3 className="relative mt-6 text-2xl font-extrabold text-ink-950">Join as a Job Provider</h3>
                <p className="relative mt-3 max-w-md leading-7 text-ink-600">Establish your company profile and prepare to reach motivated student talent.</p>
                <ul className="relative mt-6 grid gap-3 text-sm text-ink-800">
                  {["Company email verification", "Provider profile review", "Role-protected account access"].map((item) => <li key={item} className="flex items-center gap-3"><Check className="size-4 text-brand-600" aria-hidden="true" />{item}</li>)}
                </ul>
                <Button variant="secondary" className="relative mt-8" onClick={() => setModalMode("register")}>Register your company <ArrowRight className="size-4" aria-hidden="true" /></Button>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-surface py-20 sm:py-24" id="how-it-works">
          <div className="page-container">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl"><span className="eyebrow"><Clock3 className="size-3.5" aria-hidden="true" /> Simple by design</span><h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-ink-950 sm:text-4xl">From registration to ready</h2></div>
              <p className="max-w-md leading-7 text-ink-600">Email verification and Admin approval are separate steps, keeping the RuWork community clear and trustworthy.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="surface-card p-6 sm:p-7">
                  <p className="text-sm font-extrabold text-brand-600">{step.number}</p>
                  <h3 className="mt-8 text-xl font-extrabold text-ink-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="page-container">
            <div className="overflow-hidden rounded-[2rem] bg-brand-700 px-6 py-12 text-center text-white shadow-soft sm:px-12">
              <p className="text-xs font-extrabold tracking-[0.18em] text-brand-200 uppercase">Your next step starts here</p>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Create a RuWork account built around your role.</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">Choose Student or Job Provider, verify your email, and complete the review process.</p>
              <Button variant="inverse" onClick={() => setModalMode("register")} className="mt-8">Create Account <ArrowRight className="size-4" aria-hidden="true" /></Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
      <RoleSelectionModal mode={modalMode || "login"} isOpen={Boolean(modalMode)} onClose={() => setModalMode(null)} onSwitchMode={() => setModalMode((mode) => mode === "login" ? "register" : "login")} />
    </div>
  );
}
