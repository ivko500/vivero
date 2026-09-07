import { sql } from '@vercel/postgres';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS plant_entries (
      id INTEGER PRIMARY KEY,
      entries JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'PUT') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureTable();

    if (request.method === 'GET') {
      const result = await sql`SELECT entries FROM plant_entries WHERE id = 1`;
      return response.status(200).json(result.rows[0]?.entries || []);
    }

    const entries = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    if (!Array.isArray(entries)) return response.status(400).json({ error: 'Entries must be an array' });

    await sql`
      INSERT INTO plant_entries (id, entries, updated_at)
      VALUES (1, ${JSON.stringify(entries)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE
      SET entries = EXCLUDED.entries, updated_at = NOW()
    `;
    return response.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Database unavailable' });
  }
}
