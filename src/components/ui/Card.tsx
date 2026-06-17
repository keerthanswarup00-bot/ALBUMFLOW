import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export function Card({ children, className, padding = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-border-primary bg-white dark:bg-bg-elevated shadow-sm',
        padding && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
