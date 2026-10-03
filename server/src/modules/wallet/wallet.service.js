import { pool } from "../../db/pool.js";

export async function getWallet(userId) {
  const { rows } = await pool.query(
    `
      SELECT
        p.id AS portfel_id,
        s.kod_waluty,
        w.nazwa,
        s.kwota
      FROM portfele p
      LEFT JOIN salda_walut s ON s.portfel_id = p.id
      LEFT JOIN waluty w ON w.kod = s.kod_waluty
      WHERE p.uzytkownik_id = $1
      ORDER BY s.kod_waluty
    `,
    [userId]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].portfel_id,
    balances: rows
      .filter((row) => row.kod_waluty !== null)
      .map((row) => ({
        currency: row.kod_waluty,
        name: row.nazwa,
        amount: row.kwota,
      })),
  };
}

export async function depositToWallet(userId, amount, requestId) {
  const client = await pool.connect();
  let releaseError;

  try {
    await client.query("BEGIN");

    const { rows: [wallet] } = await client.query(
      `
        SELECT id
        FROM portfele
        WHERE uzytkownik_id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (!wallet) {
      const error = new Error("Nie znaleziono portfela.");
      error.code = "WALLET_NOT_FOUND";
      throw error;
    }

    const { rows: [existingDeposit] } = await client.query(
      `
        SELECT id, kwota, data_utworzenia
        FROM wplaty
        WHERE portfel_id = $1
          AND identyfikator_zadania = $2
      `,
      [wallet.id, requestId]
    );

    if (existingDeposit) {
      if (existingDeposit.kwota !== amount) {
        const error = new Error(
          "Identyfikator żądania został użyty z inną kwotą."
        );
        error.code = "DEPOSIT_REQUEST_CONFLICT";
        throw error;
      }

      await client.query("COMMIT");

      return {
        created: false,
        deposit: {
          id: existingDeposit.id,
          currency: "PLN",
          amount: existingDeposit.kwota,
          createdAt: existingDeposit.data_utworzenia,
        },
      };
    }

    const balanceResult = await client.query(
      `
        UPDATE salda_walut
        SET kwota = kwota + $1::numeric
        WHERE portfel_id = $2
          AND kod_waluty = 'PLN'
        RETURNING kwota
      `,
      [amount, wallet.id]
    );

    if (balanceResult.rowCount !== 1) {
      throw new Error("Nie znaleziono salda PLN.");
    }

    const { rows: [deposit] } = await client.query(
      `
        INSERT INTO wplaty (
          portfel_id,
          identyfikator_zadania,
          kwota
        )
        VALUES ($1, $2, $3::numeric)
        RETURNING id, kwota, data_utworzenia
      `,
      [wallet.id, requestId, amount]
    );

    await client.query("COMMIT");

    return {
      created: true,
      deposit: {
        id: deposit.id,
        currency: "PLN",
        amount: deposit.kwota,
        createdAt: deposit.data_utworzenia,
      },
    };
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

export async function getDepositHistory(userId) {
  const { rows } = await pool.query(
    `
      SELECT w.id, w.kwota, w.data_utworzenia
      FROM wplaty w
      JOIN portfele p ON p.id = w.portfel_id
      WHERE p.uzytkownik_id = $1
      ORDER BY w.data_utworzenia DESC, w.id DESC
      LIMIT 50
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    currency: "PLN",
    amount: row.kwota,
    createdAt: row.data_utworzenia,
  }));
}