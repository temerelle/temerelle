import { useId, type InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

// Label above, 48px tall input (tap target), optional hint below
export function Field({ label, hint, className = "", ...input }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">
        {label}
      </label>
      <input
        id={id}
        className="input-field border w-full h-12 px-4 rounded-lg"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-subtle mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
