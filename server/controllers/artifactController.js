const mongoose = require('mongoose');
const Artifact = require('../models/Artifact');
const User     = require('../models/User');

// ─── POST /api/artifacts ────────────────────────────────────────────────────
// Submits a Wayback capture the user found for curation review.
// If the same wayback_url was already submitted (by this user or anyone
// else), we don't create a duplicate Artifact — we bump flag_count on the
// existing one instead. This is the dedup logic the admin queue sort
// (flag_count desc) depends on.
const submit = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.canSubmit()) {
      return res.status(429).json({
        success:        false,
        message:        'You have reached your daily submission limit.',
        upgrade_prompt: true,
      });
    }

    const {
      wayback_url,
      original_url,
      capture_timestamp,
      domain,
      name,
      description,
      curation_reason,
    } = req.body;

    // thumbnail_url intentionally not required — live screenshot capture of
    // Wayback replay pages is unreliable, so submissions arrive without one.
    // A thumbnail is only attached later, by an admin, during curation.
    if (!wayback_url || !original_url || !name || !description || !curation_reason) {
      return res.status(400).json({
        success: false,
        message: 'wayback_url, original_url, name, description, and curation_reason are all required.',
      });
    }

    // ── Dedup check — does an Artifact for this exact capture already exist? ──
    const existing = await Artifact.findOne({ wayback_url });

    if (existing) {
      existing.flag_count += 1;
      await existing.save();

      // Not charging a submission use here — the user didn't find anything
      // new, so it doesn't count against their daily cap. Mirrors the dig
      // controller's "don't charge on a dead end" pattern.
      return res.status(200).json({
        success:          true,
        already_submitted: true,
        message:          'This capture has already been submitted. Flagged as duplicate interest.',
        data:             existing,
      });
    }

    // ── Create a new pending Artifact ─────────────────────────────────────────
    const artifact = await Artifact.create({
      userId:            user._id,
      wayback_url,
      original_url,
      capture_timestamp: capture_timestamp || Date.now(),
      domain:             domain || null,
      name,
      description,
      curation_reason,
      status:            'pending',
      flag_count:        0,
      // Snapshotted now, never re-derived — see Artifact.js for why.
      submitter_tier_at_submission: user.tier,
    });

    await User.findByIdAndUpdate(user._id, {
      $inc: { submission_uses_today: 1 },
    });
    user.submission_uses_today += 1;

    return res.status(201).json({
      success:           true,
      already_submitted: false,
      data:              artifact,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/artifacts/:id ──────────────────────────────────────────────────
// Single artifact detail. Gated to the submitting user or an admin — regular
// users browse curated content via Exhibit, not Artifact, so a pending or
// rejected submission shouldn't be visible to anyone else.
const getById = async (req, res, next) => {
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

    const isOwner = artifact.userId && artifact.userId.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this artifact.',
      });
    }

    return res.status(200).json({
      success: true,
      data:    artifact,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/artifacts/mine ─────────────────────────────────────────────────
// All artifacts the current user has submitted, any status, newest first —
// lets them track their own submission's review state.
const getMine = async (req, res, next) => {
  try {
    const artifacts = await Artifact.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data:    artifacts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submit, getById, getMine };