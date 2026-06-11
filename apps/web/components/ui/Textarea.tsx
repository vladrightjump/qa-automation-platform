import { forwardRef, type TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

const BASE =
  'w-full bg-card border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-ink-faint outline-none transition-colors';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', invalid = false, ...rest },
  ref,
) {
  const borderCls = invalid
    ? 'border-danger-500 focus:border-danger-600'
    : 'border-line-strong focus:border-clay-500';
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${BASE} ${borderCls} ${className}`.trim()}
      {...rest}
    />
  );
});

export default Textarea;
