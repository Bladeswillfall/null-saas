import { createContext, uploadCsvImport } from '@null/api';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function statusCodeFor(error: TRPCError): number {
  switch (error.code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'PRECONDITION_FAILED':
      return 412;
    case 'BAD_REQUEST':
      return 400;
    default:
      return 500;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const organizationId = String(formData.get('organizationId') ?? '');
    const sourceProviderId = String(formData.get('sourceProviderId') ?? '');
    const file = formData.get('file');

    if (!organizationId || !sourceProviderId || !(file instanceof File)) {
      return Response.json(
        { error: 'organizationId, sourceProviderId, and file are required.' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const ctx = createContext({
      supabase,
      user
    });

    const result = await uploadCsvImport(ctx, {
      organizationId,
      sourceProviderId,
      fileName: file.name,
      csvText
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof TRPCError) {
      return Response.json({ error: error.message }, { status: statusCodeFor(error) });
    }

    console.error('[imports/upload] Unexpected error', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
