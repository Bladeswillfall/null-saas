Deno.serve(() => {
  return Response.json({ ok: true, source: 'supabase-edge-function' });
});
