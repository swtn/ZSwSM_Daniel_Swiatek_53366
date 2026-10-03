import argon2 from "argon2";
import { pool } from "../../db/pool.js";
import { randomBytes, createHash } from "node:crypto";

export async function registerUser({ email, password }) {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const client = await pool.connect();
  let releaseError;

  try {
    await client.query("BEGIN");

    const { rows: [user] } = await client.query(
      `INSERT INTO uzytkownicy (email, skrot_hasla)
       VALUES ($1, $2)
       RETURNING id, email, data_utworzenia`,
      [email, passwordHash],
    );

    const { rows: [wallet] } = await client.query(
      `INSERT INTO portfele (uzytkownik_id)
       VALUES ($1)
       RETURNING id`,
      [user.id],
    );

    const balances = await client.query(
      `INSERT INTO salda_walut (portfel_id, kod_waluty, kwota)
       SELECT $1, kod, 0
       FROM waluty
       WHERE kod IN ('PLN', 'EUR', 'USD', 'GBP')`,
      [wallet.id],
    );

    if (balances.rowCount !== 4) {
      throw new Error("Brak wymaganych walut w bazie.");
    }

    await client.query("COMMIT");
    return user;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      releaseError = rollbackError;
    }

    throw error;
  } finally {
    client.release(releaseError);
  }
}
export async function loginUser({ email, password }) {
  const { rows: [user] } = await pool.query(
    `SELECT id, email, skrot_hasla
     FROM uzytkownicy
     WHERE email = $1`,
    [email],
  );

  if (!user) {
    return null;
  }

  const passwordMatches = await argon2.verify(
    user.skrot_hasla,
    password,
  );

  if (!passwordMatches) {
    return null;
  }

  const token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const { rows: [session] } = await pool.query(
    `INSERT INTO sesje (
       uzytkownik_id,
       skrot_tokenu,
       data_wygasniecia
     )
     VALUES ($1, $2, NOW() + INTERVAL '24 hours')
     RETURNING data_wygasniecia`,
    [user.id, tokenHash],
  );

  return {
    token,
    expiresAt: session.data_wygasniecia,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

export async function logoutUser(sessionId) {
  await pool.query(
    "DELETE FROM sesje WHERE id = $1",
    [sessionId],
  );
}