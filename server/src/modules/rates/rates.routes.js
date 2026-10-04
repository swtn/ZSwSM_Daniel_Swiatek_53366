import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { getCurrentRates, getHistoricalRates } from "./rates.service.js";

const router = Router();

router.use(requireAuth);
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return false;
  }

  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return value >= "2002-01-02" && value <= today;
}

router.get("/", async (req, res) => {
  try {
    const rates = await getCurrentRates();

    return res.status(200).json(rates);
  } catch {
    return res.status(503).json({
      error: "Kursy walut są chwilowo niedostępne. Spróbuj ponownie później.",
    });
  }
});

router.get("/historical", async (req, res) => {
  const { date } = req.query;

  if (!isValidDate(date)) {
    return res.status(400).json({
      error: "Podaj poprawną datę w formacie RRRR-MM-DD, od 2002-01-02 do dzisiaj.",
    });
  }

  try {
    const rates = await getHistoricalRates(date);
    return res.status(200).json(rates);
  } catch (error) {
    if (error.code === "RATES_NOT_FOUND") {
      return res.status(404).json({
        code: "RATES_NOT_FOUND",
        error: "NBP nie opublikował tabeli kursów dla wybranej daty.",
      });
    }

    return res.status(503).json({
      error: "Nie można teraz pobrać archiwalnych kursów. Spróbuj ponownie później.",
    });
  }
});

export default router;
