import { useId, type TextareaHTMLAttributes } from "react";

// Same look as Field, for longer text
export function TextArea({
  label,
  hint,
  className = "",
  ...textarea
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        className="input-field border w-full px-4 py-3 rounded-lg"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...textarea}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-subtle mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
