const mongoose   = require('mongoose');
const SavedItem  = require('../models/SavedItem');
const Exhibit    = require('../models/Exhibit');
const User       = require('../models/User');

const VALID_SOURCE_TYPES = ['exhibit', 'wayback_capture'];

// ─── GET /api/saved ─────────────────────────────────────────────────────────
// All of the current user's saved items, newest first.
const list = async (req, res, next) => {
  try {
    const savedItems = await SavedItem.find({ user_id: req.user._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data:    savedItems,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/saved ────────────────────────────────────────────────────────
// Saves an exhibit or a raw wayback capture to the user's dashboard.
// Enforces the free-tier saves_count cap server-side via user.canSave().
const save = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.canSave()) {
      return res.status(429).json({
        success:        false,
        message:        'You have reached your saved items limit.',
        upgrade_prompt: true,
      });
    }

    const { source_type } = req.body;

    if (!source_type || !VALID_SOURCE_TYPES.includes(source_type)) {
      return res.status(400).json({
        success: false,
        message: `A valid source_type is required. Choose ${VALID_SOURCE_TYPES.join(' or ')}.`,
      });
    }

    let savedItemData = {
      user_id:     user._id,
      source_type,
      personal_note: req.body.personal_note || null,
    };

    // ── Exhibit save — look up the Exhibit to denormalize display fields ─────
    if (source_type === 'exhibit') {
      const { exhibit_id } = req.body;

      if (!exhibit_id || !mongoose.Types.ObjectId.isValid(exhibit_id)) {
        return res.status(400).json({
          success: false,
          message: 'A valid exhibit_id is required.',
        });
      }

      const exhibit = await Exhibit.findById(exhibit_id);

      if (!exhibit) {
        return res.status(404).json({
          success: false,
          message: 'Exhibit not found.',
        });
      }

      // Reject duplicate saves of the same exhibit — the unique sparse index
      // on (user_id, artifact_id) would also catch this at the DB layer, but
      // checking here lets us return a clean 409 instead of a cast/duplicate
      // key error bubbling up through the error handler.
      const existing = await SavedItem.findOne({
        user_id:     user._id,
        artifact_id: exhibit._id,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You have already saved this exhibit.',
        });
      }

      savedItemData.artifact_id   = exhibit._id;
      savedItemData.thumbnail_url = exhibit.thumbnail;
      savedItemData.name          = exhibit.name;

    // ── Wayback capture save — client supplies everything directly ──────────
    } else {
      const { wayback_url, thumbnail_url, name } = req.body;

      if (!wayback_url || !thumbnail_url) {
        return res.status(400).json({
          success: false,
          message: 'wayback_url and thumbnail_url are required for a capture save.',
        });
      }

      // No unique index covers this case (artifact_id is null on both sides),
      // so check for an existing save of the same URL explicitly.
      const existing = await SavedItem.findOne({
        user_id:     user._id,
        source_type: 'wayback_capture',
        wayback_url,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You have already saved this capture.',
        });
      }

      savedItemData.wayback_url   = wayback_url;
      savedItemData.thumbnail_url = thumbnail_url;
      savedItemData.name          = name || null;
    }

    const savedItem = await SavedItem.create(savedItemData);

    // Keep the cached counter in sync — single source of truth check happens
    // above via canSave(), this just persists the result of that decision.
    await User.findByIdAndUpdate(user._id, { $inc: { saves_count: 1 } });
    user.saves_count += 1;

    return res.status(201).json({
      success: true,
      data:    savedItem,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/saved/:id ──────────────────────────────────────────────────
// Removes a saved item. Ownership-gated — a user can only delete their own.
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Saved item not found.',
      });
    }

    const savedItem = await SavedItem.findById(id);

    if (!savedItem) {
      return res.status(404).json({
        success: false,
        message: 'Saved item not found.',
      });
    }

    if (!savedItem.user_id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove this item.',
      });
    }

    await SavedItem.findByIdAndDelete(id);

    // Decrement, floored at 0 so a desync never drives the counter negative
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { saves_count: -1 } },
      { new: true }
    );

    if (updated.saves_count < 0) {
      await User.findByIdAndUpdate(req.user._id, { saves_count: 0 });
      req.user.saves_count = 0;
    } else {
      req.user.saves_count = updated.saves_count;
    }

    return res.status(200).json({
      success: true,
      message: 'Saved item removed.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/saved/:id/note ──────────────────────────────────────────────
// Updates only the personal_note field. Ownership-gated.
const patchNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { personal_note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Saved item not found.',
      });
    }

    const savedItem = await SavedItem.findById(id);

    if (!savedItem) {
      return res.status(404).json({
        success: false,
        message: 'Saved item not found.',
      });
    }

    if (!savedItem.user_id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this item.',
      });
    }

    savedItem.personal_note = personal_note || null;
    await savedItem.save();

    return res.status(200).json({
      success: true,
      data:    savedItem,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/saved/check ───────────────────────────────────────────────────
// Tells the frontend whether the current user has already saved a given
// exhibit_id or wayback_url — powers a saved/heart toggle without fetching
// the full list.
const check = async (req, res, next) => {
  try {
    const { exhibit_id, wayback_url } = req.query;

    if (!exhibit_id && !wayback_url) {
      return res.status(400).json({
        success: false,
        message: 'Either exhibit_id or wayback_url is required.',
      });
    }

    let query = { user_id: req.user._id };

    if (exhibit_id) {
      if (!mongoose.Types.ObjectId.isValid(exhibit_id)) {
        return res.status(200).json({ success: true, data: { saved: false } });
      }
      query.artifact_id = exhibit_id;
    } else {
      query.source_type = 'wayback_capture';
      query.wayback_url  = wayback_url;
    }

    const existing = await SavedItem.findOne(query);

    return res.status(200).json({
      success: true,
      data: {
        saved:         !!existing,
        saved_item_id: existing ? existing._id : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/saved/count ───────────────────────────────────────────────────
// Lightweight — lets the frontend show "3 of 10 saved" without fetching
// or re-deriving from the full list.
const count = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      used:  req.user.saves_count,
      limit: req.user.tier === 'paid' ? null : User.TIER_LIMITS.free.saves,
    },
  });
};

module.exports = { list, save, remove, patchNote, check, count };