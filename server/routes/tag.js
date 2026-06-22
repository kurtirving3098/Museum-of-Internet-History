const express = require("express");
const router  = express.Router();
const { listByDomain } = require("../controllers/tagController");

// ─── Public routes — no auth needed ──────────────────────────────────────────
// Tags power the search/filter UI and must be available before login.

// GET /api/tags?domain=friendster
router.get("/", listByDomain);

module.exports = router;