import { useState } from "react";
import { Check, CheckCircle2, X } from "lucide-react";
import Alert from "../common/Alert";
import Button from "../common/Button";
import FormField from "../common/FormField";
import Modal from "../common/Modal";
import TextareaField from "../common/TextareaField";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";
import { formatOriginalApplicationPrice } from "../../utils/applicationOptions";

export default function ProviderApplicationActions({ application, onUpdated }) {
  const [dialog, setDialog] = useState("");
  const originalPrice = application.budgetType === "hourly" ? application.originalHourlyRate : application.originalBudget;
  const [price, setPrice] = useState(String(originalPrice ?? ""));
  const [declineReason, setDeclineReason] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });

  if (!application.student) return null;

  function openDialog(name) {
    setState({ loading: false, error: "" });
    setDialog(name);
  }

  async function run(action) {
    setState({ loading: true, error: "" });
    try {
      let data;
      if (action === "accept") {
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          setState({ loading: false, error: "Enter a final agreed value greater than zero." });
          return;
        }
        data = await applicationService.acceptApplication(application.id, application.budgetType === "hourly" ? { approvedHourlyRate: numericPrice } : { approvedBudget: numericPrice });
      } else if (action === "decline") {
        data = await applicationService.declineApplication(application.id, declineReason.trim());
      } else {
        data = await applicationService.completeApplication(application.id);
      }
      setDialog("");
      onUpdated?.(data.application);
    } catch (error) {
      setState({ loading: false, error: getApiError(error).message });
    }
  }

  const studentName = `${application.student.firstName} ${application.student.lastName}`;
  return (
    <>
      {application.status === "pending_review" && <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => openDialog("accept")}><Check className="size-4" aria-hidden="true" />Accept</Button><Button type="button" variant="danger" onClick={() => openDialog("decline")}><X className="size-4" aria-hidden="true" />Decline</Button></div>}
      {application.status === "in_progress" && <Button type="button" onClick={() => openDialog("complete")}><CheckCircle2 className="size-4" aria-hidden="true" />Mark as Completed</Button>}

      <Modal isOpen={dialog === "accept"} onClose={() => !state.loading && setDialog("")} eyebrow="Applicant Decision" title="Accept Application" description={`Confirm ${studentName} for this work and approve the final ${application.budgetType === "hourly" ? "hourly rate" : "fixed budget"}.`}>
        {state.error && <Alert>{state.error}</Alert>}
        <dl className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-ink-600">Student</dt><dd className="font-bold text-ink-950">{studentName}</dd></div><div className="flex justify-between gap-4"><dt className="text-ink-600">Original {application.budgetType === "hourly" ? "rate" : "budget"}</dt><dd className="font-bold text-ink-950">{formatOriginalApplicationPrice(application)}</dd></div></dl>
        <FormField id={`agreed-price-${application.id}`} label={application.budgetType === "hourly" ? "Final agreed hourly rate (LKR / hour)" : "Final agreed fixed budget (LKR)"} type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-5" />
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setDialog("")} disabled={state.loading}>Cancel</Button><Button type="button" onClick={() => run("accept")} isLoading={state.loading}>Accept Application</Button></div>
      </Modal>

      <Modal isOpen={dialog === "decline"} onClose={() => !state.loading && setDialog("")} eyebrow="Applicant Decision" title="Decline this Application?" description={`${studentName} will see the declined status. This decision cannot be reversed.`}>
        {state.error && <Alert>{state.error}</Alert>}
        <TextareaField id={`decline-reason-${application.id}`} label="Reason (optional)" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} maxLength={500} helper="Keep the feedback brief and professional." className={state.error ? "mt-5" : ""} />
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setDialog("")} disabled={state.loading}>Keep Pending</Button><Button type="button" variant="danger" onClick={() => run("decline")} isLoading={state.loading}>Decline Application</Button></div>
      </Modal>

      <Modal isOpen={dialog === "complete"} onClose={() => !state.loading && setDialog("")} eyebrow="Complete Work" title="Mark this work as completed?" description={`This confirms that ${studentName}'s engagement is complete and makes it eligible for a Student Review.`}>
        {state.error && <Alert>{state.error}</Alert>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setDialog("")} disabled={state.loading}>Not Yet</Button><Button type="button" onClick={() => run("complete")} isLoading={state.loading}>Mark Completed</Button></div>
      </Modal>
    </>
  );
}
