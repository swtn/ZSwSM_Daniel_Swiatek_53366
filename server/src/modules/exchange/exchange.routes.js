import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { getCurrentRates } from "../rates/rates.service.js";
import {
  exchangeSchema,
  executeExchangeSchema,
} from "./exchange.schema.js";
import { calculateExchange } from "./exchange.calculator.js";
import { z } from "zod";
import {
  executeExchange,
  getExchangeHistory,
} from "./exchange.service.js";

const router = Router();

router.post("/preview", requireAuth, async (req, res) => {
  const validation = exchangeSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "Nieprawidłowe dane wymiany.",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  let ratesTable;

  try {
    ratesTable = await getCurrentRates();
  } catch (error) {
    console.error("Błąd pobierania kursów NBP:", error.message);

    return res.status(503).json({
      error: "Kursy walut są chwilowo niedostępne.",
    });
  }

  try {
    const preview = calculateExchange({
      ...validation.data,
      ratesTable,
    });

    return res.status(200).json({ preview });
  } catch (error) {
    if (
      error.code === "EXCHANGE_AMOUNT_TOO_SMALL" ||
      error.code === "EXCHANGE_AMOUNT_TOO_LARGE"
    ) {
      return res.status(400).json({
        error: error.message,
      });
    }

    console.error("Błąd obliczania wymiany:", error.message);

    return res.status(500).json({
      error: "Nie udało się obliczyć wymiany.",
    });
  }
});

const requestIdSchema = z.string().uuid();

router.post("/", requireAuth, async (req, res) => {
  const validation = executeExchangeSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "Nieprawidłowe dane wymiany.",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const requestIdResult = requestIdSchema.safeParse(
    req.get("Idempotency-Key")
  );

  if (!requestIdResult.success) {
    return res.status(400).json({
      error: "Nagłówek Idempotency-Key musi zawierać poprawny UUID.",
    });
  }

  try {
    const result = await executeExchange(
      req.auth.userId,
      validation.data,
      requestIdResult.data
    );

    return res.status(result.created ? 201 : 200).json({
      exchange: result.exchange,
    });
  } catch (error) {
    const statusByCode = {
      WALLET_NOT_FOUND: 404,
      EXCHANGE_REQUEST_CONFLICT: 409,
      INSUFFICIENT_FUNDS: 409,
      RATES_UNAVAILABLE: 503,
      EXCHANGE_AMOUNT_TOO_SMALL: 400,
      EXCHANGE_AMOUNT_TOO_LARGE: 400,
      EXCHANGE_RATE_CHANGED: 409,
    };

    const status = statusByCode[error.code];

    if (status) {
      return res.status(status).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error.code === "22003") {
      return res.status(400).json({
        error: "Wymiana przekroczyłaby dopuszczalny zakres salda.",
      });
    }

    console.error("Błąd wykonania wymiany:", error.code ?? error.name);

    return res.status(500).json({
      error: "Nie udało się wykonać wymiany.",
    });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  try {
    const exchanges = await getExchangeHistory(req.auth.userId);

    return res.status(200).json({ exchanges });
  } catch (error) {
    console.error(
      "Błąd pobierania historii wymian:",
      error.code ?? error.name
    );

    return res.status(500).json({
      error: "Nie udało się pobrać historii wymian.",
    });
  }
});

export default router;