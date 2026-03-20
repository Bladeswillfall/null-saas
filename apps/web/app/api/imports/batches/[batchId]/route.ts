import { createClient } from '@/lib/supabase/server';
import { loadFormattedImportRows, updateImportRowData } from '@/lib/import-workflow';

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export async function GET(_: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }

  const { data: batch, error: batchError } = await (supabase as any)
    .from('import_batches')
    .select('id, organization_id, source_provider_id, import_type, status, row_count, error_count, started_at, completed_at, created_at, source_providers(name, slug)')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    return json({ ok: false, error: batchError?.message ?? 'Batch not found.' }, 404);
  }

  const rows = await loadFormattedImportRows(supabase, batchId);
  const { data: sourceRecords } = await (supabase as any)
    .from('source_records')
    .select('id, import_file_row_id, ingestion_status')
    .eq('import_batch_id', batchId);

  const sourceRecordIds = (sourceRecords ?? []).map((row: any) => row.id);
  const { data: matches } = sourceRecordIds.length
    ? await (supabase as any)
        .from('source_record_matches')
        .select('source_record_id, is_selected')
        .in('source_record_id', sourceRecordIds)
    : { data: [] };

  const typedSourceRecords = (sourceRecords ?? []) as Array<{ id: string; import_file_row_id: string | null; ingestion_status: string }>;
  const recordByFileRowId = new Map(typedSourceRecords.map((row) => [row.import_file_row_id, row]));
  const matchCountByRecordId = new Map<string, number>();
  (matches ?? []).forEach((row: any) => {
    matchCountByRecordId.set(row.source_record_id, (matchCountByRecordId.get(row.source_record_id) ?? 0) + 1);
  });

  const reviewCount = typedSourceRecords.filter((row) => row.ingestion_status === 'needs_review').length;
  const rowPayloads = rows.map((row) => {
    const sourceRecord = recordByFileRowId.get(row.id);
    return {
      ...row,
      review_status: sourceRecord?.ingestion_status ?? (row.is_valid ? 'ready' : 'invalid'),
      candidate_count: sourceRecord ? (matchCountByRecordId.get(sourceRecord.id) ?? 0) : 0
    };
  });

  return json({
    ok: true,
    batch: {
      id: batch.id,
      organizationId: batch.organization_id,
      sourceProviderId: batch.source_provider_id,
      sourceProviderName: batch.source_providers?.name ?? 'Unknown',
      sourceProviderSlug: batch.source_providers?.slug ?? 'unknown',
      importType: batch.import_type,
      status: batch.status,
      rowCount: batch.row_count,
      errorCount: batch.error_count,
      startedAt: batch.started_at,
      completedAt: batch.completed_at,
      createdAt: batch.created_at
    },
    reviewSummary: {
      totalRows: rows.length,
      invalidRows: rows.filter((row) => !row.is_valid).length,
      reviewCount,
      readyToDeploy: rows.every((row) => row.is_valid) && reviewCount === 0
    },
    rows: rowPayloads
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }

  const body = await request.json();
  const rowId = String(body.rowId ?? '');
  const patch = body.patch as Record<string, unknown> | undefined;

  if (!rowId || !patch) {
    return json({ ok: false, error: 'Row id and patch are required.' }, 400);
  }

  const { data: row, error } = await (supabase as any)
    .from('import_file_rows')
    .select('id, import_batch_id')
    .eq('id', rowId)
    .single();

  if (error || !row || row.import_batch_id !== batchId) {
    return json({ ok: false, error: 'Import row not found for batch.' }, 404);
  }

  await updateImportRowData(supabase, rowId, patch);
  return json({ ok: true });
}
