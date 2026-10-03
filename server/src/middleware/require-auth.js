import { createHash } from "node:crypto";
import { pool } from "../db/pool.js";

export async function requireAuth(req, res, next) {
  res.set("Cache-Control", "no-store");

  const authorization = req.get("Authorization") ?? "";
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(authorization);

  if (!match) {
    return res.status(401).json({
      error: "Wymagane zalogowanie.",
    });
  }

  const tokenHash = createHash("sha256")
    .update(match[1])
    .digest("hex");

  try {
    const { rows: [session] } = await pool.query(
      `SELECT
         s.id AS session_id,
         u.id AS user_id,
         u.email
       FROM sesje s
       JOIN uzytkownicy u ON u.id = s.uzytkownik_id
       WHERE s.skrot_tokenu = $1
         AND s.data_wygasniecia > NOW()`,
      [tokenHash],
    );

    if (!session) {
      return res.status(401).json({
        error: "Sesja wygasła lub jest nieprawidłowa.",
      });
    }

    req.auth = {
      sessionId: session.session_id,
      userId: session.user_id,
      email: session.email,
    };

    next();
  } catch (error) {
    console.error("Błąd sprawdzania sesji:", error.code ?? error.name);

    return res.status(503).json({
      error: "Nie można teraz sprawdzić sesji.",
    });
  }
}