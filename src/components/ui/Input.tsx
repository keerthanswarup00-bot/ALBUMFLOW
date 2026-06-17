import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, type = 'text', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700 dark:text-text-secondary"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'bg-white dark:bg-bg-primary text-gray-900 dark:text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
            error
              ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-300 dark:border-border-primary',
            'disabled:bg-gray-50 dark:disabled:bg-bg-secondary disabled:text-gray-500 dark:disabled:text-text-muted',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-sm text-gray-500 dark:text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
