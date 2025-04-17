// server.js
// ─────────────────────────────────────────────────────────────────────────────
//  📦  dependencies & boot
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
//  ⚙️  CORS & preflight
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors()); // allow all origins; for prod lock this down
app.options("*", cors()); // enable preflight on all routes

// ─────────────────────────────────────────────────────────────────────────────
//  🔗  database pool (Neon‑friendly)
// ─────────────────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // your full Neon URL
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("🛑  PG pool error:", err);
});

(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅  PostgreSQL reachable");
  } catch (e) {
    console.error("🚨  DB connection failed at startup:", e);
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
//  REST endpoints on `/api/clicks`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/clicks
 * Body: { timestamp?: ISOString }
 */
app.post("/api/clicks", async (req, res) => {
  const ts = req.body.timestamp ?? new Date().toISOString();
  try {
    const {
      rows: [{ id }],
    } = await pool.query(
      `INSERT INTO clicks (clicked_at) VALUES ($1) RETURNING id`,
      [ts],
    );
    res.status(201).json({ id, clicked_at: ts });
  } catch (err) {
    console.error("Insert failed:", err);
    res.status(500).json({ error: "insert failed" });
  }
});

/**
 * GET /api/clicks
 */
app.get("/api/clicks", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, clicked_at FROM clicks ORDER BY id ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Query failed:", err);
    res.status(500).json({ error: "query failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  start http server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => console.log(`🚀  server listening on :${PORT}`));

// ─────────────────────────────────────────────────────────────────────────────
//  graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────
process.on("SIGINT", () => pool.end().then(() => process.exit(0)));
process.on("SIGTERM", () => pool.end().then(() => process.exit(0)));
