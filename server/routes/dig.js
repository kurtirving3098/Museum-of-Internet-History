const express = require("express");
const router  = express.Router();
const { search, thumbnail, usage, discover, countries } = require("../controllers/digController");
const { verify, resetUsage } = require("../auth");

// ─── Public routes — no auth needed ──────────────────────────────────────────

// GET /api/dig/countries
// Returns dropdown list for the discover button — called before user logs in
router.get("/countries", countries);

// ─── Protected routes — auth required ────────────────────────────────────────
// verify attaches req.user, resetUsage resets daily counters if date rolled over
router.use(verify);
router.use(resetUsage);

// GET /api/dig?domain=friendster&url_keyword=testimonials&date_from=2003...
router.get("/", search);

// GET /api/dig/thumbnail?url=https://web.archive.org/web/...
router.get("/thumbnail", thumbnail);

// GET /api/dig/usage
router.get("/usage", usage);

// GET /api/dig/discover?year=2004&country=PH
router.get("/discover", discover);

module.exports = router;