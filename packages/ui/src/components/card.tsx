import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const { style, ...restProps } = props;
  return (
    <div
      className={cn('null-ui-card', className)}
      {...restProps}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const { style, ...restProps } = props;
  return (
    <div className={cn(className)} {...restProps} style={{ padding: '1.25rem', ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>) {
  const { style, ...restProps } = props;
  return (
    <h2
      className={cn(className)}
      {...restProps}
      style={{
        marginTop: 0,
        marginBottom: '0.5rem',
        fontSize: '1.15rem',
        fontWeight: 600,
        color: 'var(--foreground)',
        ...style
      }}
    >
      {children}
    </h2>
  );
}
