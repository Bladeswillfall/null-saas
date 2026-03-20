'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@null/ui';
import { formatDateTime } from '@/lib/analytics';

type BatchSummary = {
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
};

type BatchDetail = {
  batch: {
    id: string;
    status: string;
    sourceProviderName: string;
  };
  reviewSummary: {
    totalRows: number;
    invalidRows: number;
    reviewCount: number;
    readyToDeploy: boolean;
  };
  rows: Array<{
    id: string;
    row_number: number;
    title: string;
    external_id: string;
    observed_at: string | null;
    review_status: string;
    candidate_count: number;
    validation_errors: string[] | null;
  }>;
};

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed.');
  }
  return payload as T;
}

export function ImportBatchesPanel({ batches }: { batches: BatchSummary[] }) {
  const router = useRouter();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batches[0]?.id ?? null);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedExternalId, setEditedExternalId] = useState('');
  const [editedObservedAt, setEditedObservedAt] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  async function loadDetail(batchId: string) {
    setIsLoading(true);
    setActionError(null);
    try {
      const payload = await readJson<{ ok: true } & BatchDetail>(`/api/imports/batches/${batchId}`);
      setDetail(payload);
      const firstRow = payload.rows[0];
      setSelectedRowId(firstRow?.id ?? null);
      setEditedTitle(firstRow?.title ?? '');
      setEditedExternalId(firstRow?.external_id ?? '');
      setEditedObservedAt(firstRow?.observed_at ? firstRow.observed_at.slice(0, 16) : '');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to load import review data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (selectedBatchId) {
      void loadDetail(selectedBatchId);
    } else {
      setDetail(null);
    }
  }, [selectedBatchId]);

  const selectedRow = useMemo(
    () => detail?.rows.find((row) => row.id === selectedRowId) ?? detail?.rows[0] ?? null,
    [detail, selectedRowId]
  );

  useEffect(() => {
    if (selectedRow) {
      setEditedTitle(selectedRow.title ?? '');
      setEditedExternalId(selectedRow.external_id ?? '');
      setEditedObservedAt(selectedRow.observed_at ? selectedRow.observed_at.slice(0, 16) : '');
    }
  }, [selectedRow?.id]);

  async function saveRowEdits() {
    if (!selectedBatchId || !selectedRow) return;
    setIsLoading(true);
    setActionError(null);
    try {
      await readJson(`/api/imports/batches/${selectedBatchId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          rowId: selectedRow.id,
          patch: {
            title: editedTitle,
            external_id: editedExternalId,
            observed_at: editedObservedAt ? new Date(editedObservedAt).toISOString() : null
          }
        })
      });
      await loadDetail(selectedBatchId);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save row changes.');
    } finally {
      setIsLoading(false);
    }
  }

  async function runReview() {
    if (!selectedBatchId) return;
    setIsLoading(true);
    setActionError(null);
    try {
      await readJson(`/api/imports/batches/${selectedBatchId}/review`, { method: 'POST' });
      await loadDetail(selectedBatchId);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not rerun automatic review.');
    } finally {
      setIsLoading(false);
    }
  }

  async function approveBatch() {
    if (!selectedBatchId) return;
    setIsLoading(true);
    setActionError(null);
    try {
      await readJson(`/api/imports/batches/${selectedBatchId}/approve`, { method: 'POST' });
      await loadDetail(selectedBatchId);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not deploy batch.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="analytics-panel">
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h2>Recent import batches</h2>
        <p>Automatic review runs after upload. Only approve a batch when the staged rows and match status look correct.</p>
      </div>

      {batches.length === 0 ? (
        <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
          <h3 style={{ marginTop: 0 }}>No import batches yet</h3>
          <p style={{ marginBottom: 0 }}>
            Upload your first provider CSV to create a staged import batch. Goodreads Excel files should be converted to CSV first.
          </p>
        </div>
      ) : (
        <>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Errors</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>{formatDateTime(String(batch.createdAt))}</td>
                    <td>
                      <strong>{batch.sourceProviderName}</strong>
                      <div className="analytics-table__muted">{batch.sourceProviderSlug}</div>
                    </td>
                    <td>{batch.status}</td>
                    <td>{batch.rowCount}</td>
                    <td>{batch.errorCount}</td>
                    <td>
                      <Button type="button" variant={selectedBatchId === batch.id ? 'secondary' : 'primary'} onClick={() => setSelectedBatchId(batch.id)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {actionError ? <p style={{ color: 'var(--error)', marginTop: '1rem' }}>{actionError}</p> : null}

          {detail ? (
            <div className="stack" style={{ marginTop: '1.5rem' }}>
              <div className="analytics-grid-4">
                <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
                  <strong>Status</strong>
                  <div>{detail.batch.status}</div>
                </div>
                <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
                  <strong>Invalid rows</strong>
                  <div>{detail.reviewSummary.invalidRows}</div>
                </div>
                <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
                  <strong>Needs review</strong>
                  <div>{detail.reviewSummary.reviewCount}</div>
                </div>
                <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
                  <strong>Ready to deploy</strong>
                  <div>{detail.reviewSummary.readyToDeploy ? 'Yes' : 'Not yet'}</div>
                </div>
              </div>

              <div className="analytics-actions">
                <Button type="button" variant="secondary" onClick={runReview} disabled={isLoading}>
                  {isLoading ? 'Running…' : 'Re-run automatic review'}
                </Button>
                <Button type="button" onClick={approveBatch} disabled={isLoading || !detail.reviewSummary.readyToDeploy}>
                  {isLoading ? 'Working…' : 'Approve & deploy'}
                </Button>
              </div>

              <div className="analytics-grid-2">
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Title</th>
                        <th>External ID</th>
                        <th>Status</th>
                        <th>Candidates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.rows.slice(0, 50).map((row) => (
                        <tr key={row.id} onClick={() => setSelectedRowId(row.id)} style={{ cursor: 'pointer', background: selectedRowId === row.id ? 'var(--panel-subtle)' : undefined }}>
                          <td>{row.row_number}</td>
                          <td>{row.title}</td>
                          <td>{row.external_id || '—'}</td>
                          <td>{row.review_status}</td>
                          <td>{row.candidate_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
                  <h3 style={{ marginTop: 0 }}>Edit staged row</h3>
                  {selectedRow ? (
                    <div className="analytics-form">
                      <div>
                        <Label htmlFor="review-row-title">Title</Label>
                        <Input id="review-row-title" value={editedTitle} onChange={(event) => setEditedTitle(event.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="review-row-external">External ID</Label>
                        <Input id="review-row-external" value={editedExternalId} onChange={(event) => setEditedExternalId(event.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="review-row-observed">Observed at</Label>
                        <Input id="review-row-observed" type="datetime-local" value={editedObservedAt} onChange={(event) => setEditedObservedAt(event.target.value)} />
                      </div>
                      {selectedRow.validation_errors?.length ? (
                        <ul>
                          {selectedRow.validation_errors.map((message) => <li key={message}>{message}</li>)}
                        </ul>
                      ) : (
                        <p className="analytics-table__muted" style={{ margin: 0 }}>
                          Save your fixes, then re-run automatic review. When no issues remain, approve the batch to deploy it live.
                        </p>
                      )}
                      <Button type="button" variant="secondary" onClick={saveRowEdits} disabled={isLoading}>
                        Save row changes
                      </Button>
                    </div>
                  ) : (
                    <p className="analytics-table__muted" style={{ margin: 0 }}>Select a row to edit it.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
