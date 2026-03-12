import type { ButtonHTMLAttributes, AnchorHTMLAttributes, PropsWithChildren } from 'react';
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
    return cloneElement(children, {
      className: cn((children.props as AnchorHTMLAttributes<HTMLAnchorElement>).className, mergedClassName)
    });
  }

  return (
    <button className={mergedClassName} {...props}>
      {children}
    </button>
  );
}
