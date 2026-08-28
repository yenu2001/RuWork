export default function WorkspaceStatCard({ label, value, icon: Icon, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700"
  };
  return (
    <article className="surface-card p-5 sm:p-6">
      <span className={`grid size-11 place-items-center rounded-2xl ${tones[tone] || tones.brand}`}><Icon className="size-5" aria-hidden="true" /></span>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-ink-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink-600">{label}</p>
    </article>
  );
}
