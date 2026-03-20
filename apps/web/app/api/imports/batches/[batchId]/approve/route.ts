import { createClient } from '@/lib/supabase/server';
import { createContext, matchSourceRecordsForBatch, normalizeImportBatch, rebuildScores } from '@null/api';
import { loadFormattedImportRows, rebuildBatchRawObservations, rebuildBatchSourceRecords } from '@/lib/import-workflow';

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export async function POST(_: Request, { params }: { params: Promise<{ batchId: string }> }) {
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
    .select('id, organization_id, source_provider_id, error_count')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    return json({ ok: false, error: batchError?.message ?? 'Batch not found.' }, 404);
  }

  const rows = await loadFormattedImportRows(supabase, batchId);
  const invalidRows = rows.filter((row) => !row.is_valid).length;
  if (invalidRows > 0) {
    return json({ ok: false, error: 'Fix invalid staged rows before deployment.' }, 409);
  }

  await rebuildBatchSourceRecords(supabase, {
    batchId,
    organizationId: batch.organization_id,
    sourceProviderId: batch.source_provider_id,
    rows
  });

  const ctx = createContext({ supabase: supabase as any, user });
  const reviewResult = await matchSourceRecordsForBatch(ctx, {
    batchId,
    selectedBy: user.id,
    reviewOnly: true
  });

  if (reviewResult.reviewCount > 0) {
    await (supabase as any).from('import_batches').update({ status: 'review' }).eq('id', batchId);
    return json({ ok: false, error: 'Automatic review still found rows that need human attention.' }, 409);
  }

  await rebuildBatchRawObservations(supabase, {
    batchId,
    sourceProviderId: batch.source_provider_id,
    rows,
    fileName: `approved-${batchId}.csv`
  });

  await matchSourceRecordsForBatch(ctx, {
    batchId,
    selectedBy: user.id
  });
  await normalizeImportBatch(ctx, { batchId });
  await rebuildScores(ctx, { organizationId: batch.organization_id });

  await (supabase as any)
    .from('import_batches')
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', batchId);

  return json({ ok: true });
}
