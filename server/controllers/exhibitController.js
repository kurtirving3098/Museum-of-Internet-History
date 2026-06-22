const mongoose = require('mongoose');
const Exhibit  = require('../models/Exhibit');

// ─── GET /api/exhibits ──────────────────────────────────────────────────────
// Public gallery listing. Supports pagination and an optional featured-only
// filter. Sorted by display_order so admins can control gallery sequencing
// independently of when an exhibit was created.
const list = async (req, res, next) => {
  try {
    const page     = parseInt(req.query.page, 10)      || 0;
    const pageSize = parseInt(req.query.page_size, 10) || 12;

    const query = { hidden: { $ne: true } };
    if (req.query.featured === 'true') {
      query.featured = true;
    }

    const [exhibits, total] = await Promise.all([
      Exhibit.find(query)
        .sort({ display_order: 1 })
        .skip(page * pageSize)
        .limit(pageSize),
      Exhibit.countDocuments(query),
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

// ─── GET /api/exhibits/:id ──────────────────────────────────────────────────
// Single exhibit detail view. Public — no auth required.
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Guard against a malformed ObjectId before hitting the DB — otherwise
    // Mongoose throws a CastError that would surface as a generic 500 via
    // the error handler instead of a clean 404.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found.',
      });
    }

    const exhibit = await Exhibit.findById(id);

    if (!exhibit || exhibit.hidden) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data:    exhibit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getById };