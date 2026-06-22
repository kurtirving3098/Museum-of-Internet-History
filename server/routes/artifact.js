const express = require("express");
const router  = express.Router();
const { submit, getById, getMine } = require("../controllers/artifactController");
const { verify, resetUsage } = require("../auth");

// ─── Protected routes — every artifact action requires a logged-in user ──────
router.use(verify);
router.use(resetUsage); // submission_uses_today resets daily, same as dig_uses_today

// GET /api/artifacts/mine
// IMPORTANT: must be declared before /:id, or "mine" gets matched as an
// ObjectId-shaped id param and routed to getById instead.
router.get("/mine", getMine);

// POST /api/artifacts
router.post("/", submit);

// GET /api/artifacts/:id
router.get("/:id", getById);

module.exports = router;