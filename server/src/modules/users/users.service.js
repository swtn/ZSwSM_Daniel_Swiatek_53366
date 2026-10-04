import { pool } from "../../db/pool.js";

export function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.imie,
    lastName: row.nazwisko,
    createdAt: row.data_utworzenia,
  };
}

export async function getUserProfile(userId) {
  const { rows: [row] } = await pool.query(
    `SELECT u.id, u.email, u.imie, u.nazwisko, u.data_utworzenia,
      (SELECT COUNT(*)::int FROM wplaty w
        JOIN portfele p ON p.id = w.portfel_id
        WHERE p.uzytkownik_id = u.id) AS deposit_count,
      (SELECT COUNT(*)::int FROM transakcje t
        JOIN portfele p ON p.id = t.portfel_id
        WHERE p.uzytkownik_id = u.id) AS exchange_count
     FROM uzytkownicy u WHERE u.id = $1`,
    [userId]
  );

  if (!row) return null;

  return {
    user: mapUser(row),
    activity: {
      depositCount: row.deposit_count,
      exchangeCount: row.exchange_count,
    },
  };
}

export async function updateUserProfile(userId, { firstName, lastName }) {
  const { rows: [row] } = await pool.query(
    `UPDATE uzytkownicy SET imie = $1, nazwisko = $2
     WHERE id = $3
     RETURNING id, email, imie, nazwisko, data_utworzenia`,
    [firstName, lastName, userId]
  );

  return row ? mapUser(row) : null;
}
