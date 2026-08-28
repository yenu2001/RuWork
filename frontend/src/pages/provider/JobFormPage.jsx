import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import SelectField from "../../components/common/SelectField";
import Spinner from "../../components/common/Spinner";
import TextareaField from "../../components/common/TextareaField";
import JobPreview from "../../components/jobs/JobPreview";
import SkillInput from "../../components/jobs/SkillInput";
import AppHeader from "../../components/layout/AppHeader";
import useToast from "../../hooks/useToast";
import { jobService } from "../../services/jobService";
import { getApiError } from "../../utils/apiError";
import { EMPTY_JOB_FORM, getTomorrowDateInput, JOB_CATEGORIES, JOB_SUITABLE_YEARS, toJobForm } from "../../utils/jobOptions";

const steps = ["Basics", "Skills & Scope", "Work Details", "Pricing", "Description", "Preview"];
const categoryOptions = [{ value: "", label: "Select a category" }, ...JOB_CATEGORIES.map((value) => ({ value, label: value }))];
const yearOptions = JOB_SUITABLE_YEARS.map((value) => ({ value, label: value }));
const priceOptions = [{ value: "hourly", label: "Hourly rate" }, { value: "fixed", label: "Fixed budget" }];

function validateStep(form, step) {
  const errors = {};
  if (step === 0) {
    if (!form.jobTitle.trim()) errors.jobTitle = "Enter a Job title.";
    if (!form.category) errors.category = "Select a category.";
  }
  if (step === 1) {
    if (!form.requiredSkills.length) errors.requiredSkills = "Add at least one required skill.";
    if (!form.scope.trim()) errors.scope = "Describe the scope of work.";
  }
  if (step === 2) {
    if (!form.location.trim()) errors.location = "Enter the work location or Remote.";
    if (!form.workingHours.trim()) errors.workingHours = "Describe the expected working hours.";
    if (!form.applicationDeadline) errors.applicationDeadline = "Choose an application deadline.";
    else if (form.applicationDeadline < getTomorrowDateInput()) errors.applicationDeadline = "The deadline must be in the future.";
  }
  if (step === 3) {
    const price = form.budgetType === "hourly" ? Number(form.hourlyRate) : Number(form.budget);
    if (!Number.isFinite(price) || price <= 0) errors.price = "Enter an amount greater than zero.";
  }
  if (step === 4 && !form.jobDescription.trim()) errors.jobDescription = "Describe the opportunity.";
  return errors;
}

function validateAll(form) {
  return steps.slice(0, 5).reduce((all, _, index) => ({ ...all, ...validateStep(form, index) }), {});
}

function buildPayload(form) {
  return {
    ...form,
    hourlyRate: form.budgetType === "hourly" ? Number(form.hourlyRate) : undefined,
    budget: form.budgetType === "fixed" ? Number(form.budget) : undefined
  };
}

export default function JobFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...EMPTY_JOB_FORM });
  const [existingJob, setExistingJob] = useState(null);
  const [state, setState] = useState({ status: isEditing ? "loading" : "ready", error: "" });

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    jobService.getMyJob(id)
      .then((job) => {
        if (!active) return;
        setExistingJob(job);
        setForm(toJobForm(job));
        setState({ status: "ready", error: "" });
      })
      .catch((error) => { if (active) setState({ status: "error", error: getApiError(error).message }); });
    return () => { active = false; };
  }, [id, isEditing]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setState((current) => ({ ...current, error: "" }));
  }

  function continueForward() {
    const errors = validateStep(form, step);
    if (Object.keys(errors).length) {
      setState({ status: "ready", error: Object.values(errors)[0], errors });
      return;
    }
    setState({ status: "ready", error: "", errors: {} });
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function save(status) {
    const errors = validateAll(form);
    if (Object.keys(errors).length) {
      setState({ status: "ready", error: "Please complete every required field before saving.", errors });
      setStep(Math.min(...Object.keys(errors).map((field) => {
        if (["jobTitle", "category"].includes(field)) return 0;
        if (["requiredSkills", "scope"].includes(field)) return 1;
        if (["location", "workingHours", "applicationDeadline"].includes(field)) return 2;
        if (field === "price") return 3;
        return 4;
      })));
      return;
    }
    setState({ status: "saving", error: "", errors: {} });
    try {
      const payload = buildPayload(form);
      if (isEditing) {
        await jobService.updateJob(id, { ...payload, ...(status && status !== existingJob.status ? { status } : {}) });
      } else {
        await jobService.createJob({ ...payload, status });
      }
      showToast(status === "open" ? "Job published successfully." : "Job saved as a draft.", "success");
      navigate("/provider/jobs");
    } catch (error) {
      setState({ status: "ready", error: getApiError(error).message, errors: {} });
    }
  }

  const errors = state.errors || {};
  const saveStatus = existingJob?.status || "draft";

  if (state.status === "loading") return <div className="min-h-screen bg-surface"><AppHeader /><Spinner label="Loading Job…" /></div>;
  if (state.status === "error" && isEditing && !existingJob) return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-16"><Alert>{state.error}</Alert><Button as={Link} to="/provider/jobs" variant="secondary" className="mt-5">Back to My Jobs</Button></main></div>;

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="page-container py-8 sm:py-12">
        <Link to="/provider/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to My Jobs</Link>
        <div className="mt-6 grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="surface-card h-fit p-5 lg:sticky lg:top-24">
            <p className="text-xs font-extrabold tracking-[0.14em] text-brand-600 uppercase">{isEditing ? "Edit Job" : "Post a Job"}</p>
            <ol className="mt-5 grid gap-2">
              {steps.map((label, index) => (
                <li key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${index === step ? "bg-brand-50 text-brand-700" : index < step ? "text-emerald-700" : "text-ink-400"}`} aria-current={index === step ? "step" : undefined}>
                  <span className={`grid size-7 place-items-center rounded-full text-xs ${index === step ? "bg-brand-600 text-white" : index < step ? "bg-emerald-100" : "bg-slate-100"}`}>{index < step ? <Check className="size-4" aria-hidden="true" /> : index + 1}</span>{label}
                </li>
              ))}
            </ol>
          </aside>

          <section className="surface-card p-6 sm:p-8">
            <p className="text-xs font-extrabold tracking-[0.14em] text-brand-600 uppercase">Step {step + 1} of {steps.length}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink-950">{steps[step]}</h1>
            {state.error && <Alert className="mt-5">{state.error}</Alert>}

            <div className="mt-7">
              {step === 0 && <div className="grid gap-5"><FormField id="job-title" label="Job title" value={form.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} maxLength={120} error={errors.jobTitle} placeholder="e.g. Weekend event assistant" /><div className="grid gap-5 sm:grid-cols-2"><SelectField id="job-category" label="Category" value={form.category} onChange={(event) => update("category", event.target.value)} options={categoryOptions} error={errors.category} /><SelectField id="job-year" label="Suitable for" value={form.suitableFor} onChange={(event) => update("suitableFor", event.target.value)} options={yearOptions} /></div></div>}
              {step === 1 && <div className="grid gap-6"><SkillInput value={form.requiredSkills} onChange={(value) => update("requiredSkills", value)} error={errors.requiredSkills} /><TextareaField id="job-scope" label="Scope of work" value={form.scope} onChange={(event) => update("scope", event.target.value)} maxLength={1000} error={errors.scope} helper="Explain the deliverables and boundaries of the work." /></div>}
              {step === 2 && <div className="grid gap-5"><FormField id="job-location" label="Location" value={form.location} onChange={(event) => update("location", event.target.value)} maxLength={160} error={errors.location} placeholder="e.g. Matara or Remote" /><FormField id="job-hours" label="Working hours" value={form.workingHours} onChange={(event) => update("workingHours", event.target.value)} maxLength={160} error={errors.workingHours} placeholder="e.g. Saturdays, 8:00 AM–2:00 PM" /><FormField id="job-deadline" label="Application deadline" type="date" min={getTomorrowDateInput()} value={form.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} error={errors.applicationDeadline} /></div>}
              {step === 3 && <div className="grid gap-5"><SelectField id="job-price-type" label="Pricing type" value={form.budgetType} onChange={(event) => update("budgetType", event.target.value)} options={priceOptions} />{form.budgetType === "hourly" ? <FormField id="job-hourly-rate" label="Hourly rate (LKR)" type="number" min="0.01" step="0.01" value={form.hourlyRate} onChange={(event) => update("hourlyRate", event.target.value)} error={errors.price} /> : <FormField id="job-fixed-budget" label="Fixed budget (LKR)" type="number" min="0.01" step="0.01" value={form.budget} onChange={(event) => update("budget", event.target.value)} error={errors.price} />}</div>}
              {step === 4 && <TextareaField id="job-description" label="Job description" value={form.jobDescription} onChange={(event) => update("jobDescription", event.target.value)} maxLength={2000} error={errors.jobDescription} helper="Tell students what the role involves and what success looks like." />}
              {step === 5 && <JobPreview job={buildPayload(form)} companyName={existingJob?.companyName} />}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || state.status === "saving"}><ArrowLeft className="size-4" aria-hidden="true" />Previous</Button>
              {step < steps.length - 1 ? <Button type="button" onClick={continueForward}>Continue <ArrowRight className="size-4" aria-hidden="true" /></Button> : <div className="flex flex-col gap-3 sm:flex-row">{(!isEditing || existingJob.status === "draft") && <Button type="button" variant="secondary" onClick={() => save("draft")} isLoading={state.status === "saving"}><Save className="size-4" aria-hidden="true" />Save Draft</Button>}<Button type="button" onClick={() => save(saveStatus === "closed" ? "open" : "open")} isLoading={state.status === "saving"}><Eye className="size-4" aria-hidden="true" />{existingJob?.status === "open" ? "Save Changes" : existingJob?.status === "closed" ? "Reopen Job" : "Publish Job"}</Button></div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
