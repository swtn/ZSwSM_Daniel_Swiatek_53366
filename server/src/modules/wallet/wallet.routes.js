import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { z } from "zod";
import {
  getWallet,
  depositToWallet,
  getDepositHistory,
} from "./wallet.service.js";
import { depositSchema } from "./wallet.schema.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const wallet = await getWallet(req.auth.userId);

    if (!wallet) {
      return res.status(404).json({
        error: "Nie znaleziono portfela.",
      });
    }

    return res.status(200).json({ wallet });
  } catch (error) {
    console.error("Błąd pobierania portfela:", error.code ?? error.name);

    return res.status(500).json({
      error: "Nie udało się pobrać portfela.",
    });
  }
});

const requestIdSchema = z.string().uuid();

router.post("/deposits", requireAuth, async (req, res) => {
  const bodyResult = depositSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Nieprawidłowa kwota wpłaty.",
      details: bodyResult.error.issues.map((issue) => ({
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
    const result = await depositToWallet(
      req.auth.userId,
      bodyResult.data.amount,
      requestIdResult.data
    );

    return res.status(result.created ? 201 : 200).json({
      deposit: result.deposit,
    });
  } catch (error) {
    if (error.code === "WALLET_NOT_FOUND") {
      return res.status(404).json({
        error: "Nie znaleziono portfela.",
      });
    }

    if (error.code === "DEPOSIT_REQUEST_CONFLICT") {
      return res.status(409).json({
        error: "Ten identyfikator żądania został użyty z inną kwotą.",
      });
    }

    console.error("Błąd wpłaty:", error.code ?? error.name);

    return res.status(500).json({
      error: "Nie udało się wykonać wpłaty.",
    });
  }
});

router.get("/deposits", requireAuth, async (req, res) => {
  try {
    const deposits = await getDepositHistory(req.auth.userId);

    return res.status(200).json({ deposits });
  } catch (error) {
    console.error(
      "Błąd pobierania historii wpłat:",
      error.code ?? error.name
    );

    return res.status(500).json({
      error: "Nie udało się pobrać historii wpłat.",
    });
  }
});

export default router;