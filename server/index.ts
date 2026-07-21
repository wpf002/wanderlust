// Placeholder — replaced by the backend port.
import express from "express";
const app = express();
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.listen(5000, () => console.log("API listening on :5000"));
