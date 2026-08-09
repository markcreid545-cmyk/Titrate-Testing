// GET /api/lookup?batch=SOME-BATCH-ID
// Reads from the D1 database bound as "DB" in the Cloudflare Pages project settings.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const batchId = (url.searchParams.get('batch') || '').trim();

  if (!batchId) {
    return json({ error: 'Missing batch parameter' }, 400);
  }

  try {
    const row = await env.DB.prepare(
      `SELECT
         b.batch_id, b.product, b.labeled_mg, b.measured_mg,
         b.purity_pct, b.test_lab, b.test_date, b.status, b.coa_url,
         v.name AS vendor_name, v.tier AS vendor_tier
       FROM batches b
       JOIN vendors v ON b.vendor_id = v.id
       WHERE b.batch_id = ?`
    ).bind(batchId).first();

    if (!row) {
      return json({ found: false }, 200);
    }

    return json({ found: true, result: row }, 200);
  } catch (err) {
    return json({ error: 'Lookup failed', detail: String(err) }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
