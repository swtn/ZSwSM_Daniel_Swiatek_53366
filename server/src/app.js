import express from 'express';
import { pool } from "./db/pool.js";
import authRoutes from "./modules/auth/auth.routes.js";
import walletRoutes from "./modules/wallet/wallet.routes.js";
import ratesRoutes from "./modules/rates/rates.routes.js";
import exchangeRoutes from "./modules/exchange/exchange.routes.js";

import usersRoutes from "./modules/users/users.routes.js";
import historyRoutes from "./modules/history/history.routes.js";
import securityRoutes from "./modules/auth/security.routes.js";

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/auth", securityRoutes);
app.use("/users", usersRoutes);
app.use("/history", historyRoutes);
app.use("/wallet", walletRoutes);
app.use("/rates", ratesRoutes);
app.use("/exchange", exchangeRoutes);

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "ok",
            database: "ok",
        });
    } catch (error) {
        console.error("Sprawdzenie bazy nie powiodło się:", error.message);

        res.status(503).json({
            status: "error",
            database: "unavailable",
        });
    }
});

export default app;
