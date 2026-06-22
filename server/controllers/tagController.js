const Tag = require('../models/Tag');

const VALID_DOMAINS = ['friendster', 'pinoyexchange', 'sfogs'];

// ─── GET /api/tags ──────────────────────────────────────────────────────────
// Returns all tags for a given domain. Public — no auth required, since the
// search/filter UI needs this before a user logs in.
const listByDomain = async (req, res, next) => {
  try {
    const { domain } = req.query;

    if (!domain || !VALID_DOMAINS.includes(domain)) {
      return res.status(400).json({
        success: false,
        message: `A valid domain is required. Choose ${VALID_DOMAINS.join(' or ')}.`,
      });
    }

    const tags = await Tag.find({ domain }).sort({ label: 1 });

    return res.status(200).json({
      success: true,
      data:    tags,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listByDomain };