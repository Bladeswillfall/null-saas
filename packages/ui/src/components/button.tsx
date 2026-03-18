import type { ButtonHTMLAttributes, PropsWithChildren, ReactElement } from 'react';
import { cloneElement, isValidElement } from 'react';
import { cn } from '../lib/cn';

type CommonProps = PropsWithChildren<{
  variant?: 'primary' | 'secondary';
  asChild?: boolean;
}>;

type NativeButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

type ButtonProps = NativeButtonProps;

const buttonClass = (variant: 'primary' | 'secondary' = 'primary') =>
  cn(
    'null-ui-button',
    variant === 'primary' ? 'null-ui-button--primary' : 'null-ui-button--secondary'
  );

export function Button({ children, variant = 'primary', asChild, className, ...props }: ButtonProps) {
  const mergedClassName = cn(buttonClass(variant), className);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown> & { className?: string }>;
    return cloneElement(child, {
      ...props,
      className: cn(child.props.className, mergedClassName)
    });
  }

  return (
    <button className={mergedClassName} {...props}>
      {children}
    </button>
  );
}
