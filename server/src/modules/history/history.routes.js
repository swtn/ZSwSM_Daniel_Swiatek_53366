import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/require-auth.js";
import { pool } from "../../db/pool.js";

const router = Router();
router.use(requireAuth);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return value >= "0001-01-01" && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const filters = z.object({
  type: z.enum(["all", "deposit", "buy", "sell"]).default("all"),
  currency: z.enum(["all", "PLN", "EUR", "USD", "GBP"]).default("all"),
  from: day.optional(), to: day.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(1000).optional(),
}).strict().refine(value => !value.from || !value.to || value.from <= value.to);
const cursorSchema = z.object({
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/).refine(value => {
    const date = new Date(value);
    return value >= "0001-01-01" && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19);
  }),
  type: z.enum(["deposit", "buy", "sell"]), id: z.string().uuid(),
}).strict();
const operations = `
  SELECT w.id, 'deposit'::text AS type, 'PLN'::text AS "fromCurrency",
    'PLN'::text AS "toCurrency", w.kwota::text AS "sourceAmount",
    w.kwota::text AS "targetAmount", NULL::text AS "exchangeRate",
    NULL::text AS "rateType", NULL::text AS "tableNumber",
    NULL::text AS "effectiveDate", w.identyfikator_zadania AS "requestId",
    w.data_utworzenia AS created_at
  FROM wplaty w JOIN portfele p ON p.id = w.portfel_id WHERE p.uzytkownik_id = $1
  UNION ALL
  SELECT t.id, CASE WHEN t.waluta_zrodlowa = 'PLN' THEN 'buy' ELSE 'sell' END,
    t.waluta_zrodlowa::text, t.waluta_docelowa::text,
    t.kwota_zrodlowa::text, t.kwota_docelowa::text, t.kurs::text,
    t.typ_kursu, t.numer_tabeli, TO_CHAR(t.data_kursu, 'YYYY-MM-DD'),
    t.identyfikator_zadania, t.data_utworzenia
  FROM transakcje t JOIN portfele p ON p.id = t.portfel_id WHERE p.uzytkownik_id = $1
`;
function map(row) {
  const { created_at, cursor_time, ...item } = row;
  return { ...item, createdAt: created_at };
}
router.get("/", async (req, res) => {
  const parsed = filters.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe filtry historii." });
  const f = parsed.data;
  let cursor = null;
  try {
    if (f.cursor) cursor = cursorSchema.parse(JSON.parse(Buffer.from(f.cursor, "base64url").toString("utf8")));
  } catch { return res.status(400).json({ error: "Nieprawidłowy znacznik strony." }); }
  try {
    const { rows } = await pool.query(`WITH operations AS (${operations})
      SELECT *, TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time
      FROM operations
      WHERE ($2 = 'all' OR type = $2)
        AND ($3 = 'all' OR "fromCurrency" = $3 OR "toCurrency" = $3)
        AND ($4::date IS NULL OR created_at >= ($4::date::timestamp AT TIME ZONE 'Europe/Warsaw'))
        AND ($5::date IS NULL OR created_at < (($5::date + 1)::timestamp AT TIME ZONE 'Europe/Warsaw'))
        AND ($6::timestamptz IS NULL OR (created_at, type, id) < ($6::timestamptz, $7::text, $8::uuid))
      ORDER BY created_at DESC, type DESC, id DESC LIMIT $9`,
      [req.auth.userId, f.type, f.currency, f.from ?? null, f.to ?? null,
        cursor?.time ?? null, cursor?.type ?? null, cursor?.id ?? null, f.limit + 1]);
    const page = rows.slice(0, f.limit);
    const last = page.at(-1);
    const nextCursor = rows.length > f.limit ? Buffer.from(JSON.stringify({ time: last.cursor_time, type: last.type, id: last.id })).toString("base64url") : null;
    return res.json({ items: page.map(map), nextCursor });
  } catch (error) {
    console.error("History:", error.code ?? error.name);
    return res.status(500).json({ error: "Nie udało się pobrać historii." });
  }
});
router.get("/:type/:id", async (req, res) => {
  if (!z.enum(["deposit", "buy", "sell"]).safeParse(req.params.type).success || !z.string().uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Nieprawidłowy identyfikator operacji." });
  try {
    const { rows } = await pool.query(`WITH operations AS (${operations}) SELECT * FROM operations WHERE type = $2 AND id = $3`, [req.auth.userId, req.params.type, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Nie znaleziono operacji." });
    return res.json({ item: map(rows[0]) });
  } catch {
    return res.status(500).json({ error: "Nie udało się pobrać szczegółów operacji." });
  }
});
export default router;
