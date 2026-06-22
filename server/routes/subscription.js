const express = require("express");
const router  = express.Router();
const { getPlans, subscribe, cancel } = require("../controllers/subscriptionController");
const { verify } = require("../auth");

// ─── Public route — pricing page must be visible before login ───────────────
router.get("/plans", getPlans);

// ─── Protected routes — must be logged in to subscribe or cancel ────────────
router.use(verify);

router.post("/subscribe", subscribe);
router.post("/cancel",    cancel);

module.exports = router;