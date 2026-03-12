import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn('null-ui-input', error && 'null-ui-input--error', className)}
      {...props}
    />
  );
}
