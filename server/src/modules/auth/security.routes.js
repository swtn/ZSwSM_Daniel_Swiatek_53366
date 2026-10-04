import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import { pool } from "../../db/pool.js";
import { requireAuth } from "../../middleware/require-auth.js";

const router = Router();
router.use(requireAuth);
const credentials = z.object({ currentPassword: z.string().min(1).max(128) }).strict();
const passwordChange = credentials.extend({ newPassword: z.string().min(12).max(128) }).refine(value => value.currentPassword !== value.newPassword);

async function withUserLock(auth, action) {
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query("BEGIN");
    const { rows: [user] } = await client.query("SELECT skrot_hasla FROM uzytkownicy WHERE id = $1 FOR UPDATE", [auth.userId]);
    const session = await client.query("SELECT id FROM sesje WHERE id = $1 AND uzytkownik_id = $2 AND data_wygasniecia > NOW()", [auth.sessionId, auth.userId]);
    if (!user || session.rowCount !== 1) {
      const error = new Error("Sesja wygasła. Zaloguj się ponownie."); error.status = 401; throw error;
    }
    const result = await action(client, user);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { releaseError = rollbackError; }
    throw error;
  } finally { client.release(releaseError); }
}
async function verify(user, password) {
  if (!await argon2.verify(user.skrot_hasla, password)) {
    const error = new Error("Obecne hasło jest nieprawidłowe."); error.status = 403; throw error;
  }
}
router.get("/sessions", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, data_utworzenia AS "createdAt", data_wygasniecia AS "expiresAt" FROM sesje WHERE uzytkownik_id = $1 AND data_wygasniecia > NOW() ORDER BY data_utworzenia DESC, id DESC`, [req.auth.userId]);
    res.json({ sessions: rows.map(row => ({ ...row, isCurrent: row.id === req.auth.sessionId })) });
  } catch { res.status(500).json({ error: "Nie udało się pobrać sesji." }); }
});
router.delete("/sessions/:id", async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: "Nieprawidłowy identyfikator sesji." });
  try {
    const removed = await withUserLock(req.auth, async client => client.query("DELETE FROM sesje WHERE id = $1 AND uzytkownik_id = $2", [req.params.id, req.auth.userId]));
    if (!removed.rowCount) return res.status(404).json({ error: "Nie znaleziono sesji." });
    return res.status(204).end();
  } catch (error) { return res.status(error.status ?? 500).json({ error: error.status ? error.message : "Nie udało się zakończyć sesji." }); }
});
router.post("/password", async (req, res) => {
  const parsed = passwordChange.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nowe hasło musi mieć od 12 do 128 znaków i różnić się od obecnego." });
  try {
    await withUserLock(req.auth, async (client, user) => {
      await verify(user, parsed.data.currentPassword);
      const hash = await argon2.hash(parsed.data.newPassword, { type: argon2.argon2id });
      await client.query("UPDATE uzytkownicy SET skrot_hasla = $1 WHERE id = $2", [hash, req.auth.userId]);
      await client.query("DELETE FROM sesje WHERE uzytkownik_id = $1 AND id <> $2", [req.auth.userId, req.auth.sessionId]);
    });
    return res.status(204).end();
  } catch (error) { return res.status(error.status ?? 500).json({ error: error.status ? error.message : "Nie udało się zmienić hasła." }); }
});
router.post("/logout-all", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Podaj obecne hasło." });
  try {
    await withUserLock(req.auth, async (client, user) => {
      await verify(user, parsed.data.currentPassword);
      await client.query("DELETE FROM sesje WHERE uzytkownik_id = $1", [req.auth.userId]);
    });
    return res.status(204).end();
  } catch (error) { return res.status(error.status ?? 500).json({ error: error.status ? error.message : "Nie udało się zakończyć sesji." }); }
});
export default router;
