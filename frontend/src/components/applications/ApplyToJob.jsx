import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import Alert from "../common/Alert";
import Button from "../common/Button";
import Modal from "../common/Modal";
import TextareaField from "../common/TextareaField";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate, formatJobPrice } from "../../utils/jobOptions";

export default function ApplyToJob({ job, viewer, existingApplication, lookupStatus = "ready", onApplied }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState({ status: "idle", error: "", application: null });
  const isAvailable = job.availabilityStatus === "open";

  async function submit(event) {
    event.preventDefault();
    if (note.trim().length < 20) {
      setState((current) => ({ ...current, error: "Write at least 20 characters about your interest or relevant experience." }));
      return;
    }
    setState((current) => ({ ...current, status: "submitting", error: "" }));
    try {
      const data = await applicationService.applyToJob(job.id, { applicationNote: note.trim() });
      setState({ status: "success", error: "", application: data.application });
    } catch (error) {
      const safeError = getApiError(error);
      if (safeError.code === "APPLICATION_ALREADY_EXISTS" && error.response?.data?.applicationId) {
        onApplied?.({ id: error.response.data.applicationId, status: "pending_review" });
      }
      setState((current) => ({ ...current, status: "idle", error: safeError.message }));
    }
  }

  function closeModal() {
    if (state.status === "success") onApplied?.(state.application);
    setOpen(false);
  }

  if (!isAvailable) return <Button className="mt-6 w-full" disabled>Applications closed</Button>;
  if (!viewer) return <Button as={Link} to="/login/student" className="mt-6 w-full">Log in as a Student to Apply</Button>;
  if (viewer.role !== "student") return <Button className="mt-6 w-full" disabled>Only Students can Apply</Button>;
  if (lookupStatus === "loading") return <Button className="mt-6 w-full" disabled>Checking Application status…</Button>;
  if (existingApplication) return <Button as={Link} to={`/student/applications/${existingApplication.id}`} variant="secondary" className="mt-6 w-full">Application submitted · View Application</Button>;

  return (
    <>
      <Button type="button" className="mt-6 w-full" onClick={() => setOpen(true)}><Send className="size-4" aria-hidden="true" />Apply for this Job</Button>
      <Modal isOpen={open} onClose={() => state.status !== "submitting" && closeModal()} eyebrow="Student Application" title={state.status === "success" ? "Application submitted" : `Apply for ${job.jobTitle}`} description={state.status === "success" ? "Your Application has been sent to the Job Provider for review." : `${job.companyName} · ${formatJobPrice(job)} · Apply by ${formatJobDate(job.applicationDeadline)}`}>
        {state.status === "success" ? <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-7" aria-hidden="true" /></span><p className="mt-5 text-sm leading-6 text-ink-600">Submitting does not guarantee acceptance. You can follow the Provider&apos;s decision from My Applications.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Button as={Link} to="/student/applications">View My Applications</Button><Button type="button" variant="secondary" onClick={closeModal}>Return to Job</Button></div></div> : <form onSubmit={submit}>{state.error && <Alert>{state.error}</Alert>}<TextareaField id={`application-note-${job.id}`} label="Application note" value={note} onChange={(event) => setNote(event.target.value)} minLength={20} maxLength={1000} error={state.error ? "Review the message above." : ""} helper="Briefly explain your interest or relevant experience. Messaging comes later." className={state.error ? "mt-5" : ""} /><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={state.status === "submitting"}>Cancel</Button><Button type="submit" isLoading={state.status === "submitting"}>Submit Application</Button></div></form>}
      </Modal>
    </>
  );
}
