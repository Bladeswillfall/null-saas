'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Label } from '@null/ui';
import type { CsvValidationError, ImportBatchSummary } from '@null/domain';
import { trpc } from '@/lib/trpc';
import { formatCompactNumber, formatDateTime } from '@/lib/analytics';
import { useOrganization } from '@/lib/context/organization-context';
import {
  AnalyticsStateNotice,
  Badge,
  DataTable,
  EmptyState,
  SectionCard,
  StatCard
} from '../_components/analytics-ui';

type UploadResponse = {
  batch: ImportBatchSummary | null;
  storedRowCount: number;
  errorCount: number;
  errors: CsvValidationError[];
};

export default function ImportsPage() {
  const { organization } = useOrganization();
  const utils = trpc.useUtils();
  const [file, setFile] = useState<File | null>(null);
  const [sourceProviderId, setSourceProviderId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notesByFlag, setNotesByFlag] = useState<Record<string, string>>({});
  const [assignmentByFlag, setAssignmentByFlag] = useState<Record<string, string>>({});

  const sourceQuery = trpc.sourceProvider.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );
  const batchQuery = trpc.importBatch.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );
  const qualityQuery = trpc.quality.list.useQuery(
    {
      organizationId: organization?.id ?? '',
      unresolvedOnly: true,
      batchId: selectedBatchId ?? undefined
    },
    { enabled: Boolean(organization) }
  );
  const workQuery = trpc.work.list.useQuery(
    {
      organizationId: organization?.id ?? '',
      category: 'all'
    },
    { enabled: Boolean(organization) }
  );

  const normalizeMutation = trpc.importBatch.normalize.useMutation({
    onSuccess: () => {
      utils.importBatch.list.invalidate();
      utils.quality.list.invalidate();
      utils.freshness.list.invalidate();
      utils.leaderboard.overview.invalidate();
    }
  });
  const resolveMutation = trpc.quality.resolve.useMutation({
    onSuccess: () => {
      utils.quality.list.invalidate();
      utils.importBatch.list.invalidate();
      utils.leaderboard.overview.invalidate();
    }
  });
  const assignMutation = trpc.quality.assignWork.useMutation({
    onSuccess: () => {
      utils.quality.list.invalidate();
      utils.importBatch.list.invalidate();
      utils.work.list.invalidate();
      utils.leaderboard.overview.invalidate();
    }
  });
  const rebuildMutation = trpc.leaderboard.rebuildScores.useMutation({
    onSuccess: () => {
      utils.leaderboard.listGlobal.invalidate();
      utils.leaderboard.listIps.invalidate();
      utils.leaderboard.overview.invalidate();
    }
  });

  const sources = sourceQuery.data?.status === 'ready' ? sourceQuery.data.data : [];
  const batches = batchQuery.data?.status === 'ready' ? batchQuery.data.data : [];
  const flags = qualityQuery.data?.status === 'ready' ? qualityQuery.data.data : [];
  const works = workQuery.data?.status === 'ready' ? workQuery.data.data : [];

  const stats = useMemo(() => {
    const batchCount = batches.length;
    const processedRows = batches.reduce((sum, batch) => sum + batch.rowCount, 0);
    const unresolvedFlags = batches.reduce((sum, batch) => sum + batch.unresolvedFlagCount, 0);
    const normalizedRows = batches.reduce((sum, batch) => sum + batch.normalizedCount, 0);

    return {
      batchCount,
      processedRows,
      unresolvedFlags,
      normalizedRows
    };
  }, [batches]);

  const upload = async () => {
    if (!organization || !sourceProviderId || !file) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.set('organizationId', organization.id);
    formData.set('sourceProviderId', sourceProviderId);
    formData.set('file', file);

    try {
      const response = await fetch('/api/imports/upload', {
        method: 'POST',
        body: formData
      });
      const payload = (await response.json()) as UploadResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Upload failed.');
      }

      setUploadResult(payload);
      utils.importBatch.list.invalidate();
      utils.quality.list.invalidate();
      utils.freshness.list.invalidate();
      utils.leaderboard.overview.invalidate();
      setFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Imports & QC</h1>
        <p>Upload CSV observations, normalize them into tracked works, and clear the remaining manual review queue.</p>
      </div>

      {sourceQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={sourceQuery.data.reason} />
      ) : null}
      {batchQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Import history unavailable" body={batchQuery.data.reason} />
      ) : null}
      {qualityQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Quality queue unavailable" body={qualityQuery.data.reason} />
      ) : null}

      <section className="analytics-grid-4">
        <StatCard label="Batches" value={stats.batchCount} caption="CSV runs recorded for this organization" />
        <StatCard label="Stored Rows" value={formatCompactNumber(stats.processedRows)} caption="Valid raw observations kept in-repo" />
        <StatCard label="Normalized Rows" value={formatCompactNumber(stats.normalizedRows)} caption="Rows converted into metric observations" />
        <StatCard label="Open QC Flags" value={formatCompactNumber(stats.unresolvedFlags)} caption="Still waiting for manual review or dismissal" />
      </section>

      <SectionCard title="Upload CSV" description="This repo pass validates headers and rows, stores valid observations, and reports malformed rows immediately.">
        {sources.length === 0 ? (
          <EmptyState
            title="No source providers configured"
            body="Create a source provider before attempting your first import."
            actionLabel="Open Source Catalog"
            actionHref="/dashboard/catalog/sources"
          />
        ) : (
          <div className="analytics-form">
            <div className="analytics-form__row">
              <div>
                <Label>Source Provider</Label>
                <select
                  className="null-ui-input"
                  value={sourceProviderId}
                  onChange={(event) => setSourceProviderId(event.target.value)}
                >
                  <option value="">Select source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>CSV File</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="analytics-actions">
              <Button onClick={upload} disabled={!organization || !sourceProviderId || !file || isUploading}>
                {isUploading ? 'Uploading...' : 'Upload Batch'}
              </Button>
              {organization ? (
                <Button
                  variant="secondary"
                  onClick={() => rebuildMutation.mutate({ organizationId: organization.id })}
                  disabled={rebuildMutation.isPending}
                >
                  {rebuildMutation.isPending ? 'Rebuilding...' : 'Rebuild Scores'}
                </Button>
              ) : null}
            </div>
            {uploadError ? <p style={{ color: 'var(--error)', margin: 0 }}>{uploadError}</p> : null}
          </div>
        )}
      </SectionCard>

      {uploadResult ? (
        <SectionCard title="Latest Upload Result" description="Malformed rows are only reported immediately in this repo pass. Durable import error storage is deferred to the later Supabase/v0 update.">
          <div className="analytics-grid-4">
            <StatCard label="Stored Rows" value={uploadResult.storedRowCount} />
            <StatCard label="Validation Errors" value={uploadResult.errorCount} />
            <StatCard label="Batch Status" value={uploadResult.batch?.status ?? 'n/a'} />
            <StatCard label="Batch ID" value={uploadResult.batch?.id.slice(0, 8) ?? 'n/a'} />
          </div>
          {uploadResult.errors.length > 0 ? (
            <DataTable headers={['Line', 'Field', 'Message']}>
              {uploadResult.errors.map((error, index) => (
                <tr key={`${error.line}-${error.field ?? 'row'}-${index}`}>
                  <td>{error.line}</td>
                  <td>{error.field ?? 'row'}</td>
                  <td>{error.message}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No validation failures" body="Every uploaded row passed the immediate CSV contract checks." />
          )}
        </SectionCard>
      ) : null}

      <SectionCard title="Batch History" description="Normalize batches after upload to create metric observations and QC flags.">
        {batches.length === 0 ? (
          <EmptyState title="No imports yet" body="Upload a CSV batch to create the first raw observation history." />
        ) : (
          <DataTable headers={['Source', 'Status', 'Rows', 'Errors', 'Normalized', 'Unresolved', 'Completed', 'Actions']}>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td>
                  <strong>{batch.sourceProviderName}</strong>
                  <span className="analytics-table__muted">{batch.sourceProviderSlug}</span>
                </td>
                <td>
                  <Badge tone={batch.status === 'complete' ? 'success' : batch.status === 'failed' ? 'error' : batch.status === 'partial' ? 'warning' : 'neutral'}>
                    {batch.status}
                  </Badge>
                </td>
                <td>{batch.rowCount}</td>
                <td>{batch.errorCount}</td>
                <td>{batch.normalizedCount}</td>
                <td>{batch.unresolvedFlagCount}</td>
                <td>{formatDateTime(batch.completedAt?.toString() ?? batch.createdAt.toString())}</td>
                <td>
                  <div className="analytics-actions">
                    <Button
                      variant="secondary"
                      onClick={() => normalizeMutation.mutate({ batchId: batch.id })}
                      disabled={normalizeMutation.isPending}
                    >
                      Normalize
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedBatchId((current) => (current === batch.id ? null : batch.id))}
                    >
                      {selectedBatchId === batch.id ? 'Show All Flags' : 'Review Flags'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard
        title="Quality Queue"
        description={selectedBatchId ? 'Showing unresolved flags for the selected batch.' : 'Showing unresolved flags across every batch in the organization.'}
      >
        {flags.length === 0 ? (
          <EmptyState title="No unresolved flags" body="Normalization and manual review have cleared the current queue." />
        ) : (
          <DataTable headers={['Severity', 'Work / Raw Title', 'Source', 'Issue', 'Observed', 'Actions']}>
            {flags.map((flag) => (
              <tr key={flag.id}>
                <td>
                  <Badge tone={flag.severity === 'critical' ? 'error' : flag.severity === 'warning' ? 'warning' : 'neutral'}>
                    {flag.severity}
                  </Badge>
                </td>
                <td>
                  <strong>{flag.workTitle ?? flag.rawTitle ?? 'Unmatched observation'}</strong>
                  <span className="analytics-table__muted">{flag.rawIpName ?? 'No IP detected'}</span>
                </td>
                <td>{flag.sourceProviderName ?? 'Unknown source'}</td>
                <td>
                  <strong>{flag.flagType}</strong>
                  <span className="analytics-table__muted">{flag.notes ?? 'No notes'}</span>
                </td>
                <td>{formatDateTime(flag.observedAt?.toString())}</td>
                <td>
                  <div className="analytics-stack-sm">
                    {flag.rawObservationId ? (
                      <select
                        className="null-ui-input"
                        value={assignmentByFlag[flag.id] ?? ''}
                        onChange={(event) =>
                          setAssignmentByFlag((current) => ({ ...current, [flag.id]: event.target.value }))
                        }
                      >
                        <option value="">Assign to work</option>
                        {works.map((work) => (
                          <option key={work.id} value={work.id}>
                            {work.title}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <Input
                      placeholder="Resolution notes"
                      value={notesByFlag[flag.id] ?? ''}
                      onChange={(event) => setNotesByFlag((current) => ({ ...current, [flag.id]: event.target.value }))}
                    />
                    <div className="analytics-actions">
                      {flag.rawObservationId ? (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            assignMutation.mutate({
                              rawObservationId: flag.rawObservationId!,
                              workId: assignmentByFlag[flag.id] ?? ''
                            })
                          }
                          disabled={assignMutation.isPending || !assignmentByFlag[flag.id]}
                        >
                          Assign Work
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        onClick={() =>
                          resolveMutation.mutate({
                            flagId: flag.id,
                            notes: notesByFlag[flag.id]
                          })
                        }
                        disabled={resolveMutation.isPending}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard title="Deferred Supabase / v0 Follow-up" description="These items were intentionally left as later database-side work while this pass stays repo-only.">
        <div className="analytics-links">
          <span>Regenerate `packages/db-types/src/database.generated.ts` after the analytics schema lands.</span>
          <span>Decide whether database storage keeps `franchises` or migrates to an `ips` table naming scheme.</span>
          <span>Add durable invalid-row persistence such as `import_errors` instead of only immediate response reporting.</span>
          <span>Tighten analytics RLS and add DB-side jobs or views for scheduled refresh and overnight rebuild flows.</span>
        </div>
      </SectionCard>
    </main>
  );
}
