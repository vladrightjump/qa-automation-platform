import type { ReactNode } from 'react';

interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  errorTestId?: string;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  hint,
  error,
  errorTestId,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <label
        htmlFor={htmlFor}
        className="block text-[12.5px] font-medium text-ink-soft"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[12.5px] text-ink-faint">{hint}</p>
      )}
      {error && (
        <p
          role="alert"
          data-testid={errorTestId}
          className="text-[13px] text-danger-500"
        >
          {error}
        </p>
      )}
    </div>
  );
}
