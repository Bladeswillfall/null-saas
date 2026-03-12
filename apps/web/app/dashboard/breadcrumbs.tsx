'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

export function Breadcrumbs() {
  const pathname = usePathname();
  
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1); // Skip 'dashboard'

  if (segments.length === 0) {
    return null;
  }

  const breadcrumbs = segments.map((segment, idx) => {
    const href = '/dashboard/' + segments.slice(0, idx + 1).join('/');
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = idx === segments.length - 1;

    return { label, href, isLast };
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href="/dashboard" className="breadcrumb-item">
        Dashboard
      </Link>
      {breadcrumbs.map((crumb) => (
        <Fragment key={crumb.href}>
          <span className="breadcrumb-separator">/</span>
          {crumb.isLast ? (
            <span className="breadcrumb-current">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="breadcrumb-item">
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
