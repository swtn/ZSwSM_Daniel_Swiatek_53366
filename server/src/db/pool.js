import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
});

pool.on("error", (error) => {
    console.error("Błąd połączenia z bazą:", error.message);
});