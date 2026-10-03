import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { getCurrentRates } from "./rates.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const rates = await getCurrentRates();

    return res.status(200).json(rates);
  } catch (error) {
    console.error("Błąd pobierania kursów NBP:", error.message);

    return res.status(503).json({
      error: "Kursy walut są chwilowo niedostępne. Spróbuj ponownie później.",
    });
  }
});

export default router;