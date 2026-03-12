'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: '◆' },
  { label: 'Subsidiaries', href: '/dashboard/subsidiaries', icon: '▦' },
  { label: 'IPs', href: '/dashboard/ips', icon: '◉' },
  { label: 'Creators', href: '/dashboard/creators', icon: '◇' },
  { label: 'Agreements', href: '/dashboard/agreements', icon: '═' },
  { label: 'Payouts', href: '/dashboard/payouts', icon: '◈' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙' },
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

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="sidebar-nav">
        <div className="sidebar-header">
          <h2 className="sidebar-title">NULL</h2>
        </div>
        
        <div className="sidebar-menu">
          {navItems.map((item) => {
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
