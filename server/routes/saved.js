const express = require("express");
const router  = express.Router();
const { list, save, remove, patchNote, check, count } = require("../controllers/savedItemController");
const { verify } = require("../auth");

// ─── Protected routes — every saved-item action requires a logged-in user ────
router.use(verify);

// GET /api/saved
router.get("/", list);

// GET /api/saved/count
router.get("/count", count);

// GET /api/saved/check?exhibit_id=... or ?wayback_url=...
router.get("/check", check);

// POST /api/saved
router.post("/", save);

// PATCH /api/saved/:id/note
router.patch("/:id/note", patchNote);

// DELETE /api/saved/:id
router.delete("/:id", remove);

module.exports = router;