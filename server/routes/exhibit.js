const express = require("express");
const router  = express.Router();
const { list, getById } = require("../controllers/exhibitController");

// ─── Public routes — no auth needed ──────────────────────────────────────────
// The gallery is browsable by anyone, logged in or not.

// GET /api/exhibits?page=0&page_size=12&featured=true
router.get("/", list);

// GET /api/exhibits/:id
router.get("/:id", getById);

module.exports = router;