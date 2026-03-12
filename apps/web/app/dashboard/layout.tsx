import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <Breadcrumbs />
        </div>
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
