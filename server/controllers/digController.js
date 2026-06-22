const WaybackService    = require('../services/waybackService');
const DiggingSession    = require('../models/DiggingSession');
const User              = require('../models/User');

// ─── Helper: build the usage summary returned with every response ─────────────
const buildUsageSummary = (user) => {
  const isPaid = user.tier === 'paid';
  const used   = user.dig_uses_today;
  const limit  = isPaid ? null : 5;

  return {
    used,
    limit,
    remaining:     isPaid ? null : Math.max(0, limit - used),
    tier:          user.tier,
    upgrade_prompt: !isPaid && used >= limit - 1, // warn on second-to-last use
  };
};

// ─── GET /api/dig ─────────────────────────────────────────────────────────────
// Advanced search. Translates query params into a CDX search via WaybackService.
const search = async (req, res, next) => {
  try {
    const user = req.user;

    // ── Enforce daily dig limit ──────────────────────────────────────────────
    if (!user.canDig()) {
      return res.status(429).json({
        success:        false,
        message:        'You have reached your daily digging limit.',
        upgrade_prompt: true,
        usage:          buildUsageSummary(user),
      });
    }

    // ── Validate domain (required field) ─────────────────────────────────────
    // Accepts either a curated preset key (friendster, pinoyexchange) or any
    // freeform domain/URL the user typed. We only check that *something* was
    // provided — waybackService.normalizeDomainInput() handles cleanup, and
    // an unrecognized or malformed domain simply yields zero CDX results
    // rather than a 400. This is what lets "Dig deeper" work for any site
    // surfaced via Discover, not just the two original presets.
    const { domain } = req.query;

    if (!domain || !domain.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A domain is required. Choose a preset or enter your own.',
      });
    }

    // ── Build filters from query params ───────────────────────────────────────
    const filters = {
      domain,
      url_keyword:  req.query.url_keyword  || null,
      date_from:    req.query.date_from    || null,
      date_to:      req.query.date_to      || null,
      mime_type:    req.query.mime_type    || 'html',
      status_code:  req.query.status_code  || null,
      match_type:   req.query.match_type   || 'domain',
      collapse:     req.query.collapse !== 'false', // default true
      page:         parseInt(req.query.page, 10) || 0,
      page_size:    25,
    };

    // ── Call WaybackService ───────────────────────────────────────────────────
    const results = await WaybackService.searchCDX(filters);

    // ── Increment dig counter — but only on a genuinely NEW search ────────────
    // Paginating through results you already found (page > 0) isn't a new
    // dig — it's looking at more of the one you already paid for. Charging
    // per page-click would let a single search exhaust a free-tier user's
    // entire daily limit in a handful of Next clicks. Only page 0 counts.
    const isNewSearch = filters.page === 0;

    if (isNewSearch) {
      await User.findByIdAndUpdate(user._id, {
        $inc: { dig_uses_today: 1 },
      });
      user.dig_uses_today += 1; // keep in-memory object in sync
    }

    // ── Log the session ───────────────────────────────────────────────────────
    // Logged regardless of page, for accurate analytics on what was searched —
    // just doesn't cost a use beyond the initial page-0 request.
    await DiggingSession.create({
      user_id:      user._id,
      query:        filters.url_keyword || filters.domain,
      domain:       filters.domain,
      filters: {
        date_from:   filters.date_from,
        date_to:     filters.date_to,
        mime_type:   filters.mime_type,
        status_code: filters.status_code,
        url_keyword: filters.url_keyword,
        match_type:  filters.match_type,
        collapse:    filters.collapse,
        page:        filters.page,
      },
      results_count: results.results.length,
      session_type:  'search',
      from_cache:    results.from_cache,
    });

    return res.status(200).json({
      success: true,
      data:    results,
      usage:   buildUsageSummary(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/dig/thumbnail ───────────────────────────────────────────────────
// Proxy endpoint. Dormant from the frontend's perspective (no longer called
// by Dig.vue — see waybackService.js's formatResult comment) but left fully
// functional per project decision, rather than removed.
const thumbnail = async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'url query parameter is required.',
      });
    }

    // Sanity check — only proxy Wayback Machine URLs
    if (!url.includes('web.archive.org')) {
      return res.status(400).json({
        success: false,
        message: 'Only Wayback Machine URLs are supported.',
      });
    }

    const result = await WaybackService.proxyThumbnail(url);

    if (!result) {
      // Null means mshots returned a placeholder, a non-image response, or
      // the request failed. Return 404 so any caller renders its own
      // fallback instead.
      return res.status(404).json({
        success: false,
        message: 'Thumbnail not available for this capture.',
      });
    }

    // Tell the browser to cache the image for 24 hours too
    res.set('Content-Type',  result.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(result.data);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/dig/usage ───────────────────────────────────────────────────────
// Lightweight endpoint. Frontend calls this on page load to render the
// "X of 5 uses remaining" indicator without triggering an actual search.
const usage = async (req, res) => {
  return res.status(200).json({
    success: true,
    data:    buildUsageSummary(req.user),
  });
};

// ─── GET /api/dig/discover ────────────────────────────────────────────────────
// Random discover button. Requires ?year= and optional ?country= (defaults PH).
// Costs 1 dig use — the internal retry loop is transparent to the user.
const discover = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.canDig()) {
      return res.status(429).json({
        success:        false,
        message:        'You have reached your daily digging limit.',
        upgrade_prompt: true,
        usage:          buildUsageSummary(user),
      });
    }

    const year    = parseInt(req.query.year, 10);
    const country = (req.query.country || 'PH').toUpperCase();

    if (!year || year < 1991 || year > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        message: 'A valid year between 1991 and today is required.',
      });
    }

    const validCountries = ['PH', 'JP', 'US'];
    if (!validCountries.includes(country)) {
      return res.status(400).json({
        success: false,
        message: `Invalid country. Supported values: ${validCountries.join(', ')}.`,
      });
    }

    const result = await WaybackService.discoverRandom(year, country);

    // No results found — do NOT charge a dig use for a dead-end
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
        usage:   buildUsageSummary(user),
      });
    }

    // Increment usage and log session
    await User.findByIdAndUpdate(user._id, { $inc: { dig_uses_today: 1 } });
    user.dig_uses_today += 1;

    await DiggingSession.create({
      user_id:       user._id,
      query:         result.site.url,
      domain:        result.site.url,
      filters: {
        date_from:   `${year}-01-01`,
        date_to:     `${year}-12-31`,
        mime_type:   'html',
        status_code: null,
        url_keyword: null,
        match_type:  'domain',
        collapse:    true,
        page:        0,
      },
      results_count: result.results.results.length,
      session_type:  'random',
      from_cache:    result.from_cache,
    });

    return res.status(200).json({
      success: true,
      data:    result,
      usage:   buildUsageSummary(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/dig/countries ───────────────────────────────────────────────────
// Returns the supported countries list for the frontend dropdown.
// No auth required — this is called before the user logs in.
const countries = (req, res) => {
  return res.status(200).json({
    success: true,
    data:    WaybackService.getSupportedCountries(),
  });
};

module.exports = { search, thumbnail, usage, discover, countries };