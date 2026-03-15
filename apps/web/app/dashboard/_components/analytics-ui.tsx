'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import Link from 'next/link';
import { Button, Card, CardBody, CardTitle, Input, Label } from '@null/ui';

export function AnalyticsStateNotice({
  title,
  body,
  tone = 'warning'
}: {
  title: string;
  body: string;
  tone?: 'warning' | 'error' | 'info';
}) {
  const className =
    tone === 'error' ? 'analytics-notice analytics-notice--error' : tone === 'info' ? 'analytics-notice' : 'analytics-notice analytics-notice--warning';

  return (
    <div className={className}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  caption
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="analytics-stat">
          <span className="analytics-stat__label">{label}</span>
          <strong className="analytics-stat__value">{value}</strong>
          {caption ? <span className="analytics-stat__caption">{caption}</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children
}: PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>) {
  return (
    <Card>
      <CardBody>
        <div className="analytics-section__header">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <p className="muted analytics-section__description">{description}</p> : null}
          </div>
          {action}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

export function Badge({
  children,
  tone = 'neutral'
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'error' | 'accent' }>) {
  return <span className={`analytics-badge analytics-badge--${tone}`}>{children}</span>;
}

export function Toolbar({
  children
}: PropsWithChildren) {
  return <div className="analytics-toolbar">{children}</div>;
}

export function ToolbarField({
  label,
  children
}: PropsWithChildren<{ label: string }>) {
  return (
    <div className="analytics-toolbar__field">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ToolbarInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />;
}

export function ToolbarSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="null-ui-input" {...props} />;
}

export function DataTable({
  headers,
  children
}: PropsWithChildren<{ headers: string[] }>) {
  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="analytics-empty">
      <strong>{title}</strong>
      <p>{body}</p>
      {actionLabel && actionHref ? (
        <Button asChild variant="secondary">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
