import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn('null-ui-card', className)}
      {...props}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn(className)} {...props} style={{ padding: '1.25rem' }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>) {
  return (
    <h2 className={cn(className)} {...props} style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.15rem', fontWeight: 600, color: 'var(--foreground)' }}>
      {children}
    </h2>
  );
}
