import { createServerTRPCClient } from '@/lib/trpc/server';
import { AnalyticsStateNotice } from '../_components/analytics-ui';
import { UploadForm } from './upload-form';
import { ImportBatchesTable } from './import-batches-table';

export default async function ImportsPage() {
  const trpc = await createServerTRPCClient();

  let organization: { id: string; name: string } | null = null;
  let providers: Array<{ id: string; slug: string; name: string }> = [];
  let batches: Array<{
    id: string;
    sourceProviderName: string;
    sourceProviderSlug: string;
    importType: string;
    status: string;
    rowCount: number;
    errorCount: number;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    createdAt: Date | string;
  }> = [];
  let loadError: string | null = null;

  try {
    const organizations = await trpc.organization.list.query();
    organization = organizations[0] ?? null;

    if (!organization) {
      loadError = 'Create or join an organization before managing imports.';
    } else {
      const [providerResult, batchResult] = await Promise.all([
        trpc.sourceProvider.list.query({ organizationId: organization.id }),
        trpc.importBatch.list.query({ organizationId: organization.id })
      ]);

      providers = providerResult.status === 'ready'
        ? providerResult.data.map((provider) => ({ id: provider.id, slug: provider.slug, name: provider.name }))
        : [];
      batches = batchResult.status === 'ready'
        ? batchResult.data.slice(0, 20)
        : [];

      if (providerResult.status !== 'ready') {
        loadError = providerResult.reason;
      } else if (batchResult.status !== 'ready') {
        loadError = batchResult.reason;
      }
    }
  } catch (error) {
    console.error('Failed to load imports dashboard', error);
    loadError = 'We could not load your organization, providers, or import history right now. Please refresh and try again.';
  }

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Imports</h1>
        <p>Upload provider CSV files, stage them into Supabase, and review the most recent import batches.</p>
      </div>

      {loadError ? (
        <AnalyticsStateNotice
          title="Imports data unavailable"
          body={loadError}
        />
      ) : null}

      <section className="analytics-grid-2">
        <div className="analytics-panel">
          <h2>CSV only for now</h2>
          <p>Upload a CSV export from Goodreads or Amazon/Kindle charts. Direct XLSX parsing is not part of V1.</p>
          <ul>
            <li>CSV files are supported in this dashboard flow.</li>
            <li>Convert Goodreads Excel files to CSV before uploading.</li>
            <li>After staging, review the batch, resolve unmatched rows, then rebuild scores.</li>
          </ul>
        </div>
        <div className="analytics-panel">
          <h2>What happens after upload?</h2>
          <p>Your file is parsed in the app, mapped into staged import rows, then stored through the Supabase import pipeline.</p>
          <ul>
            <li><strong>Batch created:</strong> a row is written to <code>public.import_batches</code>.</li>
            <li><strong>Rows staged:</strong> mapped rows are inserted through <code>public.stage_import_rows(...)</code>.</li>
            <li><strong>Next steps:</strong> review the batch, resolve unmatched rows, and rebuild scores.</li>
          </ul>
        </div>
      </section>

      <UploadForm organizationId={organization?.id ?? null} providers={providers} loadError={loadError} />
      <ImportBatchesTable batches={batches} />
    </main>
  );
}
