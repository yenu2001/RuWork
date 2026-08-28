import { useState } from "react";
import { Ban, Undo2 } from "lucide-react";
import Alert from "../common/Alert";
import Button from "../common/Button";
import Modal from "../common/Modal";
import TextareaField from "../common/TextareaField";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";

export default function StudentApplicationActions({ application, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });
  const isPending = application.status === "pending_review";
  const isInProgress = application.status === "in_progress";
  if (!isPending && !isInProgress) return null;

  async function confirm() {
    setState({ loading: true, error: "" });
    try {
      const data = isPending
        ? await applicationService.withdrawApplication(application.id)
        : await applicationService.cancelApplication(application.id, reason.trim());
      setOpen(false);
      onUpdated?.(data.application);
    } catch (error) {
      setState({ loading: false, error: getApiError(error).message });
    }
  }

  return (
    <>
      <Button type="button" variant={isPending ? "secondary" : "danger"} onClick={() => setOpen(true)}>
        {isPending ? <Undo2 className="size-4" aria-hidden="true" /> : <Ban className="size-4" aria-hidden="true" />}
        {isPending ? "Withdraw Application" : "Cancel In-Progress Work"}
      </Button>
      <Modal
        isOpen={open}
        onClose={() => !state.loading && setOpen(false)}
        eyebrow={isPending ? "Withdraw Application" : "Cancel Work"}
        title={isPending ? "Withdraw this Application?" : "Cancel this in-progress engagement?"}
        description={isPending ? "The Provider will no longer be able to accept it. This action cannot be reversed." : "The engagement will end as Cancelled for both parties and cannot later be marked completed."}
      >
        {state.error && <Alert>{state.error}</Alert>}
        {isInProgress && <TextareaField id={`cancellation-reason-${application.id}`} label="Reason (optional)" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} helper="A short reason can help the Provider understand the cancellation." className={state.error ? "mt-5" : ""} />}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={state.loading}>Keep Application</Button>
          <Button type="button" variant="danger" onClick={confirm} isLoading={state.loading}>{isPending ? "Withdraw Application" : "Cancel Work"}</Button>
        </div>
      </Modal>
    </>
  );
}
