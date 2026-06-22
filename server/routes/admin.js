const express = require("express");
const router  = express.Router();
const multer  = require("multer");

const {
  getStats,
  getQueue,
  approveArtifact,
  rejectArtifact,
  editExhibit,
  listAllExhibits,
  hideExhibit,
  listUsers,
} = require("../controllers/adminController");

const { verify, verifyAdmin } = require("../auth");

// ─── Multer config — memory storage ──────────────────────────────────────────
// Files land in req.file.buffer rather than being written to disk. We hand
// that buffer straight to Cloudinary's upload_stream (see
// cloudinaryService.js), so there's never a temp file on our own server to
// clean up. Capped at 8MB — generous for a screenshot, small enough to
// reject anyone trying to upload something absurd.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 8 * 1024 * 1024 },
});

// ─── Protected — every admin route requires a logged-in admin ────────────────
router.use(verify);
router.use(verifyAdmin);

// GET /api/admin/stats
router.get("/stats", getStats);

// GET /api/admin/artifacts?status=pending&page=0
router.get("/artifacts", getQueue);

// POST /api/admin/artifacts/:id/approve
// multipart/form-data — file field name "thumbnail" (optional), plus
// name/description/era/tags as form fields.
router.post("/artifacts/:id/approve", upload.single("thumbnail"), approveArtifact);

// POST /api/admin/artifacts/:id/reject
// Plain JSON — { reviewer_note }
router.post("/artifacts/:id/reject", rejectArtifact);

// PATCH /api/admin/exhibits/:id
// multipart/form-data — file field name "thumbnail" (optional — omitting it
// leaves the existing thumbnail untouched). Other editable fields: name,
// description, era, tags, featured, display_order.
router.patch("/exhibits/:id", upload.single("thumbnail"), editExhibit);

// GET /api/admin/exhibits?page=0
// Unfiltered exhibit list (includes hidden) — feeds the admin "Manage
// Exhibits" view. The public GET /api/exhibits excludes hidden exhibits.
router.get("/exhibits", listAllExhibits);

// PATCH /api/admin/exhibits/:id/hide
// Soft-deletes the exhibit and rejects its source Artifact. One-way —
// no unhide route. Plain JSON, no file involved.
router.patch("/exhibits/:id/hide", hideExhibit);

// GET /api/admin/users
router.get("/users", listUsers);

module.exports = router;