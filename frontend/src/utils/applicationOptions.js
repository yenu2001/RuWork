export const APPLICATION_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending review" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "cancelled", label: "Cancelled" }
];

export const APPLICATION_STATUS_META = {
  pending_review: { label: "Pending review", classes: "border-amber-200 bg-amber-50 text-amber-800" },
  in_progress: { label: "In progress", classes: "border-blue-200 bg-blue-50 text-blue-800" },
  completed: { label: "Completed", classes: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  declined: { label: "Declined", classes: "border-red-200 bg-red-50 text-red-800" },
  withdrawn: { label: "Withdrawn", classes: "border-slate-200 bg-slate-100 text-slate-700" },
  cancelled: { label: "Cancelled", classes: "border-orange-200 bg-orange-50 text-orange-800" }
};

export function getApplicationStatusMeta(status) {
  return APPLICATION_STATUS_META[status] || { label: "Unknown", classes: "border-slate-200 bg-slate-100 text-slate-700" };
}

function currency(amount) {
  if (!Number.isFinite(Number(amount))) return "Not agreed yet";
  return `LKR ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 }).format(Number(amount))}`;
}

export function formatOriginalApplicationPrice(application) {
  return application.budgetType === "hourly"
    ? `${currency(application.originalHourlyRate)} / hour`
    : `${currency(application.originalBudget)} fixed`;
}

export function formatApprovedApplicationPrice(application) {
  const amount = application.budgetType === "hourly" ? application.approvedHourlyRate : application.approvedBudget;
  if (!Number.isFinite(Number(amount))) return "Not agreed yet";
  return application.budgetType === "hourly" ? `${currency(amount)} / hour` : `${currency(amount)} fixed`;
}
