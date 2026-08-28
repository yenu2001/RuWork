import { useState } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import TextareaField from "../common/TextareaField";

export default function ModerationDialog({ target, onClose, onConfirm, saving }) {
  const [reason, setReason] = useState("");
  if (!target) return null;
  const restrict = target.action === "suspend" || target.action === "hide";
  const valid = !restrict || reason.trim().length >= 5;
  const verb = target.action[0].toUpperCase() + target.action.slice(1);
  return <Modal isOpen onClose={() => !saving && onClose()} eyebrow="Admin moderation" title={`${verb} ${target.label}?`} description={restrict ? "This reversible action is enforced by the server and preserves all historical records." : "This restores normal platform visibility or access without changing historical records."}>{restrict ? <TextareaField id="moderation-reason" label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} required helper="Required, 5–500 characters. Keep it factual." /> : null}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button variant={restrict ? "danger" : "primary"} onClick={() => onConfirm(reason.trim())} disabled={!valid} isLoading={saving}>{verb}</Button></div></Modal>;
}
