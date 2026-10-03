import { Router } from "express";
import { registerSchema, loginSchema } from "./auth.schema.js";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "./auth.service.js";
import { requireAuth } from "../../middleware/require-auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Niepoprawne dane rejestracji.",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const user = await registerUser(parsed.data);

    return res.status(201).json({ user });
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "uzytkownicy_email_key"
    ) {
      return res.status(409).json({
        error: "Konto z tym adresem e-mail już istnieje.",
      });
    }

    console.error("Błąd rejestracji:", error.code ?? error.name);

    return res.status(500).json({
      error: "Nie udało się utworzyć konta.",
    });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Niepoprawne dane logowania.",
    });
  }

  try {
    const result = await loginUser(parsed.data);

    if (!result) {
      return res.status(401).json({
        error: "Niepoprawny e-mail lub hasło.",
      });
    }

    res.set("Cache-Control", "no-store");

    return res.status(200).json(result);
  } catch (error) {
    console.error("Błąd logowania:", error.code ?? error.name);

    return res.status(500).json({
      error: "Nie udało się zalogować.",
    });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    user: {
      id: req.auth.userId,
      email: req.auth.email,
    },
  });
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await logoutUser(req.auth.sessionId);

    return res.status(204).end();
  } catch (error) {
    console.error("Błąd wylogowania:", error.code ?? error.name);

    return res.status(500).json({
      error: "Nie udało się wylogować.",
    });
  }
});

export default router;