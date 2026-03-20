import { createClient } from '@/lib/supabase/server';
import { createContext, matchSourceRecordsForBatch } from '@null/api';
import { loadFormattedImportRows, rebuildBatchSourceRecords } from '@/lib/import-workflow';

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

  await (supabase as any)
    .from('import_batches')
    .update({ status: reviewResult.reviewCount > 0 || batch.error_count > 0 ? 'review' : 'pending' })
    .eq('id', batchId);

  return json({
    ok: true,
    reviewCount: reviewResult.reviewCount,
    matchedCount: reviewResult.matchedCount,
    readyToDeploy: reviewResult.reviewCount === 0 && (batch.error_count ?? 0) === 0
  });
}
