// GET /api/vendors
// Returns the vendor directory with tier ratings, from the D1 database.

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, tier, website, notes FROM vendors ORDER BY name ASC`
    ).all();

    return new Response(JSON.stringify({ vendors: results }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to load vendors', detail: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
