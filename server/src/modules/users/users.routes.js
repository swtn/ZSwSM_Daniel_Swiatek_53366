import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { updateProfileSchema } from "./users.schema.js";
import { getUserProfile, updateUserProfile } from "./users.service.js";

const router = Router();
router.use(requireAuth);

router.get("/me", async (req, res) => {
  try {
    const profile = await getUserProfile(req.auth.userId);
    if (!profile) return res.status(404).json({ error: "Nie znaleziono użytkownika." });
    return res.json(profile);
  } catch (error) {
    console.error("Błąd pobierania profilu:", error.code ?? error.name);
    return res.status(500).json({ error: "Nie udało się pobrać profilu." });
  }
});

router.patch("/me", async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Niepoprawne dane profilu.",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."), message: issue.message,
      })),
    });
  }

  try {
    const user = await updateUserProfile(req.auth.userId, parsed.data);
    if (!user) return res.status(404).json({ error: "Nie znaleziono użytkownika." });
    return res.json({ user });
  } catch (error) {
    console.error("Błąd zapisu profilu:", error.code ?? error.name);
    return res.status(500).json({ error: "Nie udało się zapisać profilu." });
  }
});

export default router;
