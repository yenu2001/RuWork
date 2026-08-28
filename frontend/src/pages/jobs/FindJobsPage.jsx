import { useEffect, useState } from "react";
import { BriefcaseBusiness, Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import SelectField from "../../components/common/SelectField";
import JobCard from "../../components/jobs/JobCard";
import JobCardSkeleton from "../../components/jobs/JobCardSkeleton";
import AppHeader from "../../components/layout/AppHeader";
import { jobService } from "../../services/jobService";
import { getApiError } from "../../utils/apiError";
import { JOB_CATEGORIES, JOB_SORTS, JOB_SUITABLE_YEARS } from "../../utils/jobOptions";

const categoryOptions = [{ value: "", label: "All categories" }, ...JOB_CATEGORIES.map((value) => ({ value, label: value }))];
const yearOptions = [{ value: "", label: "Any study year" }, ...JOB_SUITABLE_YEARS.map((value) => ({ value, label: value }))];
const budgetOptions = [
  { value: "", label: "Any pricing" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed", label: "Fixed budget" }
];

export default function FindJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const [result, setResult] = useState({ status: "loading", jobs: [], pagination: null, error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page") || 1);

  useEffect(() => {
    let active = true;
    async function loadJobs() {
      try {
        const data = await jobService.getJobs(Object.fromEntries(new URLSearchParams(queryKey).entries()));
        if (active) setResult({ status: "success", jobs: data.jobs, pagination: data.pagination, error: "" });
      } catch (error) {
        if (active) setResult({ status: "error", jobs: [], pagination: null, error: getApiError(error).message });
      }
    }
    loadJobs();
    return () => { active = false; };
  }, [queryKey, retryKey]);

  function startLoading() {
    setResult((current) => ({ ...current, status: "loading", error: "" }));
  }

  function applyFilters(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const normalized = String(value).trim();
      if (normalized) next.set(key, normalized);
    }
    next.set("sort", sort);
    next.set("page", "1");
    startLoading();
    setSearchParams(next);
  }

  function updateSort(value) {
    const next = new URLSearchParams(searchParams);
    next.set("sort", value);
    next.set("page", "1");
    startLoading();
    setSearchParams(next);
  }

  function goToPage(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    startLoading();
    setSearchParams(next);
  }

  const hasFilters = [...searchParams.keys()].some((key) => !["page", "sort"].includes(key));

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="page-container py-12 sm:py-16">
            <span className="eyebrow"><BriefcaseBusiness className="size-3.5" aria-hidden="true" /> RuWork opportunities</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.05em] text-ink-950 sm:text-5xl">Find work that fits your studies</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-600">Search approved, currently open opportunities from verified RuWork Job Providers.</p>
          </div>
        </section>

        <div className="page-container grid gap-8 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside>
            <form key={queryKey} onSubmit={applyFilters} className="surface-card sticky top-24 grid gap-5 p-5" aria-label="Job filters">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 font-extrabold text-ink-950"><SlidersHorizontal className="size-4 text-brand-600" aria-hidden="true" /> Filters</h2>
                {hasFilters && <button type="button" onClick={() => { startLoading(); setSearchParams({ sort: "newest" }); }} className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"><X className="size-3.5" aria-hidden="true" /> Clear</button>}
              </div>
              <FormField id="job-search" name="q" label="Search" placeholder="Title, company, or skill" defaultValue={searchParams.get("q") || ""} />
              <SelectField id="job-category" name="category" label="Category" options={categoryOptions} defaultValue={searchParams.get("category") || ""} />
              <FormField id="job-location" name="location" label="Location" placeholder="e.g. Matara" defaultValue={searchParams.get("location") || ""} />
              <FormField id="job-skill" name="skill" label="Skill" placeholder="e.g. Figma" defaultValue={searchParams.get("skill") || ""} />
              <SelectField id="job-year" name="suitableFor" label="Suitable year" options={yearOptions} defaultValue={searchParams.get("suitableFor") || ""} />
              <SelectField id="job-budget-type" name="budgetType" label="Pricing" options={budgetOptions} defaultValue={searchParams.get("budgetType") || ""} />
              <div className="grid grid-cols-2 gap-3">
                <FormField id="job-min-price" name="minPrice" label="Min LKR" type="number" min="0" step="100" defaultValue={searchParams.get("minPrice") || ""} />
                <FormField id="job-max-price" name="maxPrice" label="Max LKR" type="number" min="0" step="100" defaultValue={searchParams.get("maxPrice") || ""} />
              </div>
              <Button type="submit"><Search className="size-4" aria-hidden="true" /> Search Jobs</Button>
            </form>
          </aside>

          <section aria-live="polite">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-ink-950">Available Jobs</h2>
                {result.status === "success" && <p className="mt-1 text-sm text-ink-600">{result.pagination.total} {result.pagination.total === 1 ? "opportunity" : "opportunities"} found</p>}
              </div>
              <SelectField id="job-sort" label="Sort results" options={JOB_SORTS} value={sort} onChange={(event) => updateSort(event.target.value)} className="w-full sm:w-52" />
            </div>

            <JobResultsState
              result={result}
              onRetry={() => { startLoading(); setRetryKey((key) => key + 1); }}
              onClear={() => { startLoading(); setSearchParams({ sort: "newest" }); }}
            />

            {result.status === "success" && result.pagination.pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Job results pagination">
                <Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</Button>
                <span className="text-sm font-semibold text-ink-600">Page {page} of {result.pagination.pages}</span>
                <Button variant="secondary" disabled={page >= result.pagination.pages} onClick={() => goToPage(page + 1)}>Next</Button>
              </nav>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export function JobResultsState({ result, onRetry, onClear }) {
  if (result.status === "loading") return <div className="grid gap-4">{[1, 2, 3].map((item) => <JobCardSkeleton key={item} />)}</div>;
  if (result.status === "error") return <div className="surface-card p-6"><Alert>{result.error}</Alert><Button onClick={onRetry} className="mt-5">Try again</Button></div>;
  if (result.status === "success" && result.jobs.length === 0) {
    return <div className="surface-card py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Search className="size-6" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-extrabold text-ink-950">No jobs match your current filters</h3><p className="mt-2 text-sm text-ink-600">Clear a filter or try a broader search.</p><Button variant="secondary" onClick={onClear} className="mt-6">Clear filters</Button></div>;
  }
  return <div className="grid gap-4">{result.jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>;
}
