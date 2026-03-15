'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  group?: string;
}

const navItems: NavItem[] = [
  // Analytics - core product
  { label: 'Global Leaderboard', href: '/dashboard/leaderboard', icon: '📊', group: 'Analytics' },
  { label: 'IP Leaderboard', href: '/dashboard/leaderboard/ips', icon: '◆', group: 'Analytics' },
  
  // Admin/ops
  { label: 'Imports & QC', href: '/dashboard/imports', icon: '⬆', group: 'Operations' },
  { label: 'Source Freshness', href: '/dashboard/freshness', icon: '🔄', group: 'Operations' },
  
  // Catalog management (currently de-emphasized but available)
  { label: 'Catalog', href: '/dashboard/catalog', icon: '📑', group: 'Settings' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙', group: 'Settings' },
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

  // Group nav items
  const groups: { [key: string]: NavItem[] } = {};
  navItems.forEach((item) => {
    const groupName = item.group || 'Main';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
  });

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="sidebar-nav">
        <div className="sidebar-header">
          <h2 className="sidebar-title">NULL</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0 0' }}>IP Intelligence</p>
        </div>
        
        <div className="sidebar-menu">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              {groupName !== 'Main' && (
                <div style={{ 
                  padding: '0.75rem 0.5rem 0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--muted)',
                }}>
                  {groupName}
                </div>
              )}
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleSignOut} type="button">
            <span className="sidebar-icon">↪</span>
            <span className="sidebar-label">Sign out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
