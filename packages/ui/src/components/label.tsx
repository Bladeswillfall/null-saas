import type { LabelHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

type LabelProps = PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>;

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label className={cn('null-ui-label', className)} {...props}>
      {children}
    </label>
  );
}
