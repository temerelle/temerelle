"use client";
import { useState } from "react";
import { errorText } from "@/lib/apiErrors";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";

// "Are you sure?" for cancel and reject, with an optional reason the other side sees
export function ConfirmDialog({
  title,
  text,
  action,
  reasonLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  text: string;
  action: string;
  reasonLabel?: string;
  onConfirm: (reason?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim() || undefined);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Modal variant="card" onDismiss={onClose} canDismiss={!busy} labelledBy="confirm-dialog-title">
      <h2 id="confirm-dialog-title" className="text-xl">
        {title}
      </h2>
      <p className="text-body">{text}</p>
      {reasonLabel && (
        <TextArea
          label={reasonLabel}
          maxLength={300}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col space-y-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="btn-danger h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Зачекайте…" : action}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className="h-12 rounded-lg text-subtle">
          Не треба
        </button>
      </div>
    </Modal>
  );
}
