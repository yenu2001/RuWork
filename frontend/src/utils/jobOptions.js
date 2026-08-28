export const JOB_CATEGORIES = [
  "Delivery",
  "Buy and Sell",
  "Tutoring",
  "Event Support",
  "Data Entry",
  "Content Creation",
  "Other"
];

export const JOB_SUITABLE_YEARS = [
  "Any Year",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Final Year"
];

export const JOB_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" }
];

export const EMPTY_JOB_FORM = {
  jobTitle: "",
  category: "",
  suitableFor: "Any Year",
  requiredSkills: [],
  scope: "",
  location: "",
  workingHours: "",
  applicationDeadline: "",
  budgetType: "hourly",
  hourlyRate: "",
  budget: "",
  jobDescription: ""
};

export function getTomorrowDateInput() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export function formatJobPrice(job) {
  const amount = job.budgetType === "hourly" ? job.hourlyRate : job.budget;
  if (!Number.isFinite(Number(amount))) return "Price unavailable";
  const formatted = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 }).format(Number(amount));
  return `LKR ${formatted}${job.budgetType === "hourly" ? " / hour" : " fixed"}`;
}

export function formatJobDate(value) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-LK", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function getJobStatusLabel(job) {
  const status = job.availabilityStatus || job.status;
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
}

export function toJobForm(job) {
  return {
    ...EMPTY_JOB_FORM,
    jobTitle: job.jobTitle || "",
    category: job.category || "",
    suitableFor: job.suitableFor || "Any Year",
    requiredSkills: job.requiredSkills || [],
    scope: job.scope || "",
    location: job.location || "",
    workingHours: job.workingHours || "",
    applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split("T")[0] : "",
    budgetType: job.budgetType || "hourly",
    hourlyRate: job.hourlyRate ?? "",
    budget: job.budget ?? "",
    jobDescription: job.jobDescription || ""
  };
}
