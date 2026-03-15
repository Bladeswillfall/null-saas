'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  label: string;
  href: string;
  short: string;
  group: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', short: 'OV', group: 'Analytics' },
  { label: 'Global Leaderboard', href: '/dashboard/leaderboard', short: 'GL', group: 'Analytics' },
  { label: 'IP Leaderboard', href: '/dashboard/leaderboard/ips', short: 'IP', group: 'Analytics' },
  { label: 'Imports & QC', href: '/dashboard/imports', short: 'IM', group: 'Operations' },
  { label: 'Source Freshness', href: '/dashboard/freshness', short: 'SF', group: 'Operations' },
  { label: 'Catalog', href: '/dashboard/catalog', short: 'CT', group: 'Admin' },
  { label: 'Settings', href: '/dashboard/settings', short: 'ST', group: 'Admin' }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const groups = navItems.reduce<Record<string, NavItem[]>>((accumulator, item) => {
    const current = accumulator[item.group] ?? [];
    current.push(item);
    accumulator[item.group] = current;
    return accumulator;
  }, {});

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="sidebar-nav">
        <div className="sidebar-header">
          <h2 className="sidebar-title">NULL</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0 0' }}>IP Intelligence Terminal</p>
        </div>

        <div className="sidebar-menu">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <div
                style={{
                  padding: '0.75rem 0.5rem 0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--muted)'
                }}
              >
                {groupName}
              </div>
              {items.map((item) => {
                const isActive = item.href === '/dashboard' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-icon">{item.short}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleSignOut} type="button">
            <span className="sidebar-icon">SO</span>
            <span className="sidebar-label">Sign out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
