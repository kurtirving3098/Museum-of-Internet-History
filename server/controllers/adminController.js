const mongoose          = require('mongoose');
const Artifact          = require('../models/Artifact');
const Exhibit           = require('../models/Exhibit');
const User              = require('../models/User');
const CloudinaryService = require('../services/cloudinaryService');

// ─── Helper: resolve the display credit for an approved Exhibit ───────────────
// "Community" for free-tier submitters, the submitter's username for
// paid-tier submitters — based on tier AT SUBMISSION TIME (snapshotted on
// the Artifact), never the submitter's current tier. See Artifact.js for
// the full reasoning.
const resolveCreditedTo = async (artifact) => {
  if (artifact.submitter_tier_at_submission !== 'paid') {
    return 'Community';
  }

  if (!artifact.userId) {
    // Defensive fallback — shouldn't happen (a paid tier snapshot implies a
    // user existed at submission time), but never let a missing ref crash
    // the approval flow.
    return 'Community';
  }

  const submitter = await User.findById(artifact.userId).select('username');
  return submitter ? submitter.username : 'Community';
};

// ─── Helper: parse tags from a multipart field ─────────────────────────────────
// multipart/form-data fields are always strings — the frontend may send tags
// as a JSON-stringified array (`'["a","b"]'`) or a plain comma-separated
// string (`'a,b'`). Accept either rather than forcing one specific format.
const parseTags = (raw) => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(t => String(t).trim()).filter(Boolean);
  } catch {
    // Not JSON — fall through to comma-split
  }

  return raw.split(',').map(t => t.trim()).filter(Boolean);
};

// ─── Helper: compute the next sequential exhibit_number ───────────────────────
// No atomic counter collection for this MVP — acceptable race condition
// under concurrent approvals given a single-admin-at-a-time usage pattern.
const getNextExhibitNumber = async () => {
  const last = await Exhibit.findOne().sort({ exhibit_number: -1 }).select('exhibit_number');
  return last ? last.exhibit_number + 1 : 1;
};

// ─── GET /api/admin/stats ───────────────────────────────────────────────────
// Dashboard counts. verify + verifyAdmin already gate this route.
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      paidUsers,
      totalArtifacts,
      pendingArtifacts,
      approvedArtifacts,
      rejectedArtifacts,
      totalExhibits,
      featuredExhibits,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ tier: 'paid' }),
      Artifact.countDocuments({}),
      Artifact.countDocuments({ status: 'pending' }),
      Artifact.countDocuments({ status: 'approved' }),
      Artifact.countDocuments({ status: 'rejected' }),
      Exhibit.countDocuments({}),
      Exhibit.countDocuments({ featured: true }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          paid:  paidUsers,
          free:  totalUsers - paidUsers,
        },
        artifacts: {
          total:    totalArtifacts,
          pending:  pendingArtifacts,
          approved: approvedArtifacts,
          rejected: rejectedArtifacts,
        },
        exhibits: {
          total:    totalExhibits,
          featured: featuredExhibits,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/artifacts ───────────────────────────────────────────────
// Review queue. Defaults to pending only — that's the actual queue an admin
// works through — but accepts ?status= to view any bucket. Sorted by
// flag_count desc so likely-duplicate / high-interest submissions surface
// first, per the original spec.
const getQueue = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';

    const validStatuses = ['pending', 'approved', 'rejected', 'featured'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose ${validStatuses.join(', ')}.`,
      });
    }

    const page     = parseInt(req.query.page, 10)      || 0;
    const pageSize = parseInt(req.query.page_size, 10) || 20;

    const query = { status };

    const [artifacts, total] = await Promise.all([
      Artifact.find(query)
        .sort({ flag_count: -1, createdAt: -1 })
        .skip(page * pageSize)
        .limit(pageSize)
        .populate('userId', 'username tier'),
      Artifact.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        artifacts,
        currentPage: page,
        totalPages:  Math.ceil(total / pageSize) || 0,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/artifacts/:id/approve ──────────────────────────────────
// multipart/form-data. Combines the approval decision with the thumbnail
// upload into one atomic admin action, per project decision — the admin is
// already looking at the page to judge it, so they screenshot it themselves
// in that same sitting rather than this being a separate follow-up step.
// File field name expected: "thumbnail". Optional — an admin can approve
// without a thumbnail and the gallery just renders a placeholder for it.
const approveArtifact = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Artifact not found.',
      });
    }

    const artifact = await Artifact.findById(id);

    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: 'Artifact not found.',
      });
    }

    // Guard against double-review — once an Artifact has moved off
    // "pending" it shouldn't be approved again (would create a second
    // Exhibit for the same capture).
    if (artifact.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `This artifact has already been reviewed (status: ${artifact.status}).`,
      });
    }

    // ── Admin-editable fields — fall back to the submitter's originals ───────
    const name        = req.body.name        || artifact.name;
    const description = req.body.description || artifact.description;

    // ── Admin-only fields — no submitter equivalent exists ───────────────────
    const era  = req.body.era || null;
    const tags = parseTags(req.body.tags);

    // ── Thumbnail upload (optional) ───────────────────────────────────────────
    let thumbnail        = null;
    let thumbnail_public_id = null;

    if (req.file) {
      const uploadResult = await CloudinaryService.uploadThumbnail(req.file.buffer);
      thumbnail            = uploadResult.secure_url;
      thumbnail_public_id  = uploadResult.public_id;
    }

    // ── Resolve credit and exhibit number ─────────────────────────────────────
    const credited_to    = await resolveCreditedTo(artifact);
    const exhibit_number = await getNextExhibitNumber();

    // ── Create the Exhibit FIRST — only mark the Artifact approved once this
    // succeeds, so a crash mid-flow leaves the Artifact still "pending"
    // rather than a phantom "approved but no exhibit" state. ──────────────────
    const exhibit = await Exhibit.create({
      artifact_id: artifact._id,
      exhibit_number,
      display_order: exhibit_number,
      featured:      false,
      flag_count:    artifact.flag_count,
      era,
      name,
      description,
      // Auto-populated from the source Artifact — admin can override later
      // via the edit modal if the URL needs correcting.
      wayback_url:   artifact.wayback_url || null,
      tags,
      thumbnail,
      thumbnail_public_id,
      credited_to,
    });

    artifact.status      = 'approved';
    artifact.reviewed_by = req.user._id;
    artifact.reviewed_at = new Date();
    await artifact.save();

    return res.status(201).json({
      success: true,
      message: 'Artifact approved and exhibit created.',
      data: {
        artifact,
        exhibit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/artifacts/:id/reject ───────────────────────────────────
// Plain JSON — no file upload involved, so this stays a separate, simpler
// route from approve rather than one combined endpoint branching on a
// "decision" field.
const rejectArtifact = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Artifact not found.',
      });
    }

    const artifact = await Artifact.findById(id);

    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: 'Artifact not found.',
      });
    }

    if (artifact.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `This artifact has already been reviewed (status: ${artifact.status}).`,
      });
    }

    artifact.status        = 'rejected';
    artifact.reviewer_note = req.body.reviewer_note || null;
    artifact.reviewed_by   = req.user._id;
    artifact.reviewed_at   = new Date();
    await artifact.save();

    return res.status(200).json({
      success: true,
      message: 'Artifact rejected.',
      data:    artifact,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/admin/exhibits/:id ──────────────────────────────────────────
// Post-approval editing. Covers everything approveArtifact locks in at
// creation time but can't be changed afterward without this: featured
// toggle, era/tags/name/description edits, and thumbnail replacement.
// multipart/form-data — file field name "thumbnail" is optional here, and
// its absence means something different than it does on approve: no file
// means "leave the existing thumbnail alone," not "no thumbnail."
const editExhibit = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found.',
      });
    }

    const exhibit = await Exhibit.findById(id);

    if (!exhibit) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found.',
      });
    }

    // ── Plain field edits — only touch what was actually sent ────────────────
    if (req.body.name !== undefined)        exhibit.name        = req.body.name;
    if (req.body.description !== undefined) exhibit.description = req.body.description;
    if (req.body.wayback_url !== undefined) exhibit.wayback_url = req.body.wayback_url || null;
    if (req.body.era !== undefined)         exhibit.era         = req.body.era || null;
    if (req.body.tags !== undefined)        exhibit.tags        = parseTags(req.body.tags);

    if (req.body.featured !== undefined) {
      // multipart fields arrive as strings — "true"/"false", not booleans
      exhibit.featured = req.body.featured === 'true' || req.body.featured === true;
    }

    if (req.body.display_order !== undefined) {
      const parsedOrder = parseInt(req.body.display_order, 10);
      if (!Number.isNaN(parsedOrder)) exhibit.display_order = parsedOrder;
    }

    // ── Thumbnail replacement (optional) ──────────────────────────────────────
    // Upload the new image FIRST, then delete the old one — if the upload
    // fails, the existing thumbnail is left untouched rather than lost.
    if (req.file) {
      const oldPublicId = exhibit.thumbnail_public_id;

      const uploadResult = await CloudinaryService.uploadThumbnail(req.file.buffer);
      exhibit.thumbnail            = uploadResult.secure_url;
      exhibit.thumbnail_public_id  = uploadResult.public_id;

      if (oldPublicId) {
        await CloudinaryService.deleteThumbnail(oldPublicId);
      }
    }

    await exhibit.save();

    return res.status(200).json({
      success: true,
      message: 'Exhibit updated.',
      data:    exhibit,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/users ───────────────────────────────────────────────────
// Paginated user list. password_hash already excluded by select:false on
// the model, no need to strip it manually here.
const listUsers = async (req, res, next) => {
  try {
    const page     = parseInt(req.query.page, 10)      || 0;
    const pageSize = parseInt(req.query.page_size, 10) || 20;

    const [users, total] = await Promise.all([
      User.find({})
        .sort({ createdAt: -1 })
        .skip(page * pageSize)
        .limit(pageSize),
      User.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        currentPage: page,
        totalPages:  Math.ceil(total / pageSize) || 0,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/exhibits ─────────────────────────────────────────────────
// Admin-only exhibit list — unlike the public GET /api/exhibits, this
// includes hidden exhibits, since the "Manage Exhibits" admin view needs to
// show what's been soft-deleted (for audit/visibility), not just what's
// currently live in the gallery. Same pagination shape as getQueue.
const listAllExhibits = async (req, res, next) => {
  try {
    const page     = parseInt(req.query.page, 10)      || 0;
    const pageSize = parseInt(req.query.page_size, 10) || 20;

    const [exhibits, total] = await Promise.all([
      Exhibit.find({})
        .sort({ display_order: 1 })
        .skip(page * pageSize)
        .limit(pageSize),
      Exhibit.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        exhibits,
        currentPage: page,
        totalPages:  Math.ceil(total / pageSize) || 0,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/admin/exhibits/:id/hide ─────────────────────────────────────
// Soft-deletes an Exhibit from the public gallery. Deliberately NOT a hard
// delete — preserves exhibit_number (permanent, never reassigned per the
// model's own comment) and keeps the record for audit purposes. One-way:
// no unhide route exists yet: a removed exhibit's source Artifact can be
// re-submitted/re-approved fresh if it should come back later.
//
// Also flips the linked Artifact's status to "rejected" so the two
// collections stay in sync — an Exhibit that's been pulled from the gallery
// shouldn't leave its source Artifact sitting at "approved" with no visible
// exhibit to show for it.
const hideExhibit = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found.',
      });
    }

    const exhibit = await Exhibit.findById(id);

    if (!exhibit) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found.',
      });
    }

    if (exhibit.hidden) {
      return res.status(409).json({
        success: false,
        message: 'This exhibit has already been removed.',
      });
    }

    exhibit.hidden = true;
    await exhibit.save();

    // Best-effort sync on the source Artifact — don't let a missing/already
    // -modified Artifact block the Exhibit hide itself, which is the
    // primary action here.
    await Artifact.findByIdAndUpdate(exhibit.artifact_id, {
      status: 'rejected',
    });

    return res.status(200).json({
      success: true,
      message: 'Exhibit removed from the gallery.',
      data:    exhibit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getQueue,
  approveArtifact,
  rejectArtifact,
  editExhibit,
  listAllExhibits,
  hideExhibit,
  listUsers,
};