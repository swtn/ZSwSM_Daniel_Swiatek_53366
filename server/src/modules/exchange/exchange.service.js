import { pool } from "../../db/pool.js";
import { getCurrentRates } from "../rates/rates.service.js";
import { calculateExchange } from "./exchange.calculator.js";
import Decimal from "decimal.js";

function operationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function mapExchange(row) {
  return {
    id: row.id,
    fromCurrency: row.waluta_zrodlowa,
    toCurrency: row.waluta_docelowa,
    sourceAmount: row.kwota_zrodlowa,
    targetAmount: row.kwota_docelowa,
    exchangeRate: row.kurs,
    rateType: row.typ_kursu,
    tableNumber: row.numer_tabeli,
    effectiveDate: row.effective_date,
    createdAt: row.data_utworzenia,
  };
}

export async function executeExchange(userId, input, requestId) {
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
      throw operationError(
        "WALLET_NOT_FOUND",
        "Nie znaleziono portfela."
      );
    }

    const { rows: [existing] } = await client.query(
      `
        SELECT *, TO_CHAR(data_kursu, 'YYYY-MM-DD') AS effective_date
        FROM transakcje
        WHERE portfel_id = $1
          AND identyfikator_zadania = $2
      `,
      [wallet.id, requestId]
    );

    if (existing) {
      if (
        existing.waluta_zrodlowa !== input.fromCurrency ||
        existing.waluta_docelowa !== input.toCurrency ||
        existing.kwota_zrodlowa !== input.amount ||
        !new Decimal(existing.kurs).eq(input.expectedRate)
      ) {
        throw operationError(
          "EXCHANGE_REQUEST_CONFLICT",
          "Ten identyfikator żądania został użyty z innymi danymi."
        );
      }

      await client.query("COMMIT");

      return {
        created: false,
        exchange: mapExchange(existing),
      };
    }

    let ratesTable;

    try {
      ratesTable = await getCurrentRates();
    } catch {
      throw operationError(
        "RATES_UNAVAILABLE",
        "Kursy walut są chwilowo niedostępne."
      );
    }

    const calculation = calculateExchange({
      ...input,
      ratesTable,
    });

    if (!new Decimal(calculation.exchangeRate).eq(input.expectedRate)) {
  throw operationError(
    "EXCHANGE_RATE_CHANGED",
    "Kurs zmienił się. Pobierz nowy podgląd i zaakceptuj wymianę ponownie."
  );
}

    const sourceResult = await client.query(
      `
        UPDATE salda_walut
        SET kwota = kwota - $1::numeric
        WHERE portfel_id = $2
          AND kod_waluty = $3
          AND kwota >= $1::numeric
        RETURNING kwota
      `,
      [
        calculation.sourceAmount,
        wallet.id,
        calculation.fromCurrency,
      ]
    );

    if (sourceResult.rowCount !== 1) {
      throw operationError(
        "INSUFFICIENT_FUNDS",
        "Brak wystarczających środków do wykonania wymiany."
      );
    }

    const targetResult = await client.query(
      `
        UPDATE salda_walut
        SET kwota = kwota + $1::numeric
        WHERE portfel_id = $2
          AND kod_waluty = $3
        RETURNING kwota
      `,
      [
        calculation.targetAmount,
        wallet.id,
        calculation.toCurrency,
      ]
    );

    if (targetResult.rowCount !== 1) {
      throw new Error("Nie znaleziono salda waluty docelowej.");
    }

    const { rows: [exchange] } = await client.query(
      `
        INSERT INTO transakcje (
          portfel_id,
          identyfikator_zadania,
          waluta_zrodlowa,
          waluta_docelowa,
          kwota_zrodlowa,
          kwota_docelowa,
          kurs,
          typ_kursu,
          numer_tabeli,
          data_kursu
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *,
          TO_CHAR(data_kursu, 'YYYY-MM-DD') AS effective_date
      `,
      [
        wallet.id,
        requestId,
        calculation.fromCurrency,
        calculation.toCurrency,
        calculation.sourceAmount,
        calculation.targetAmount,
        calculation.exchangeRate,
        calculation.rateType,
        calculation.tableNumber,
        calculation.effectiveDate,
      ]
    );

    await client.query("COMMIT");

    return {
      created: true,
      exchange: mapExchange(exchange),
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

export async function getExchangeHistory(userId) {
  const { rows } = await pool.query(
    `
      SELECT
        t.*,
        TO_CHAR(t.data_kursu, 'YYYY-MM-DD') AS effective_date
      FROM transakcje t
      JOIN portfele p ON p.id = t.portfel_id
      WHERE p.uzytkownik_id = $1
      ORDER BY t.data_utworzenia DESC, t.id DESC
      LIMIT 50
    `,
    [userId]
  );

  return rows.map(mapExchange);
}