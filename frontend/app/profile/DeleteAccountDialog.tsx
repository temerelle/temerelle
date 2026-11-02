"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";

// Asks for the password: a stolen open session alone can't delete the account
export function DeleteAccountDialog({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError(errorText(err, "Не вдалося видалити акаунт. Спробуйте ще раз."));
      setBusy(false);
    }
  }

  return (
    <Modal onDismiss={onClose} canDismiss={!busy} labelledBy="delete-account-title">
      <form onSubmit={submit} className="space-y-4">
        <h2 id="delete-account-title" className="text-xl">
          Видалити акаунт?
        </h2>
        <p className="text-subtle">
          Акаунт і вхід зникнуть назавжди. Ваші минулі записи залишаться в історії бізнесів під вашим ім&apos;ям.
        </p>
        <Field
          label="Пароль для підтвердження"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col space-y-2">
          <button type="submit" disabled={busy} className="btn-danger h-12 rounded-lg font-medium disabled:opacity-60">
            {busy ? "Видаляємо…" : "Видалити назавжди"}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="h-12 rounded-lg text-subtle">
            Скасувати
          </button>
        </div>
      </form>
    </Modal>
  );
}
