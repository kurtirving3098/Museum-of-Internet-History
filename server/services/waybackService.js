require("dotenv").config();
const axios     = require('axios');
const NodeCache = require('node-cache');

const SEARCH_CACHE_TTL    = parseInt(process.env.SEARCH_CACHE_TTL)    || 3600;
const THUMBNAIL_CACHE_TTL = parseInt(process.env.THUMBNAIL_CACHE_TTL) || 86400;

// ─── Caches ───────────────────────────────────────────────────────────────────
const searchCache    = new NodeCache({ stdTTL: SEARCH_CACHE_TTL });
const thumbnailCache = new NodeCache({ stdTTL: THUMBNAIL_CACHE_TTL });

// ─── Constants ────────────────────────────────────────────────────────────────
const CDX_BASE_URL       = 'https://web.archive.org/cdx/search/cdx';
const WAYBACK_BASE_URL   = 'https://web.archive.org/web';
const MSHOTS_BASE_URL    = 'https://s.wordpress.com/mshots/v1';

// Domain patterns passed to the CDX url param
const DOMAIN_PATTERNS = {
  friendster:    'friendster.com',
  pinoyexchange: 'pinoyexchange.com',
};

// MIME type map — human-readable key → CDX filter value
const MIME_MAP = {
  html:  'text/html',
  jpeg:  'image/jpeg',
  gif:   'image/gif',
  png:   'image/png',
  flash: 'application/x-shockwave-flash',
  text:  'text/plain',
};

// ─── Normalize a freeform domain/URL typed by the user ─────────────────────
// CDX expects a bare domain (e.g. "example.com"), not a full URL. Strip
// protocol, "www.", and any trailing path/query. Deliberately permissive —
// no rejection of malformed input; an empty result set is the feedback.
const normalizeDomainInput = (raw) => {
  if (!raw) return raw;

  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0];
};

// ─── Build CDX query params from user filters ──────────────────────────────────
// Translates every frontend filter option into native CDX API parameters.
const buildCDXParams = (filters) => {
  const {
    domain,
    url_keyword = null,
    date_from   = null,
    date_to     = null,
    mime_type   = 'html',     // default to HTML pages
    status_code = null,
    match_type  = 'domain',   // domain = all subdomains, prefix = url path
    collapse    = true,       // true = one result per unique URL (recommended)
    page        = 0,
    page_size   = 25,
  } = filters;

  // ── Resolve the actual domain string ──────────────────────────────────────
  // `domain` can be one of the curated preset keys (friendster, pinoyexchange)
  // OR a raw domain/URL the user typed directly into the search box. Presets
  // take priority so existing callers (Discover, saved filters) keep working
  // unchanged; anything that isn't a known key is normalized and passed
  // straight through to CDX as-is.
  const baseDomain = DOMAIN_PATTERNS[domain] || normalizeDomainInput(domain);

  // ── URL pattern ──────────────────────────────────────────────────────────
  // When a url_keyword is given, switch to prefix match on the specific path
  let urlParam      = baseDomain;
  let matchTypeParam = match_type;

  if (url_keyword) {
    urlParam       = `${baseDomain}/${url_keyword}`;
    matchTypeParam = 'prefix';
  }

  // ── Base params ───────────────────────────────────────────────────────────
  const params = {
    url:       urlParam,
    output:    'json',
    fl:        'timestamp,original,statuscode,mimetype,length',
    matchType: matchTypeParam,
    pageSize:  page_size,
    page:      page,
  };

  // ── Date range ────────────────────────────────────────────────────────────
  // CDX accepts YYYYMMDD — strip dashes if user sends YYYY-MM-DD (or just
  // YYYY-MM from the year+month picker, which CDX also accepts as a prefix)
  if (date_from) params.from = date_from.replace(/-/g, '').slice(0, 8);
  if (date_to)   params.to   = date_to.replace(/-/g, '').slice(0, 8);

  // ── Filters (CDX accepts multiple filter params as array) ─────────────────
  const cdxFilters = [];

  if (mime_type && MIME_MAP[mime_type]) {
    cdxFilters.push(`mimetype:${MIME_MAP[mime_type]}`);
  }

  if (status_code) {
    cdxFilters.push(`statuscode:${status_code}`);
  }

  if (cdxFilters.length > 0) {
    // axios serializes arrays as repeated query params, which is what CDX expects
    params.filter = cdxFilters;
  }

  // ── Deduplication ─────────────────────────────────────────────────────────
  // collapse=urlkey → one result per unique URL (the most recent capture)
  // Dramatically reduces result counts and speeds up response
  if (collapse) params.collapse = 'urlkey';

  return params;
};

// ─── Execute a CDX search ─────────────────────────────────────────────────────
// NOTE on pagination: CDX's own showNumPages feature counts pages of the RAW,
// uncollapsed index — it does not account for collapse=urlkey shrinking the
// result set down to one row per unique URL. That mismatch meant totalPages
// from showNumPages was frequently meaningless (or unparseable) whenever
// collapse was active, which is true for every search this app runs. Rather
// than trust a count that's answering a different question than the one we're
// asking, we request one extra row beyond page_size and use its presence as
// a simple "is there a next page" signal. This sacrifices knowing the exact
// total page count up front, but is actually correct for the collapsed set.
//
// NOTE on status_code: CDX's filter param and collapse=urlkey don't compose
// the way you'd expect — collapse keeps only the FIRST (earliest) capture
// per unique URL before filter gets a chance to run, so filter=statuscode:200
// can only ever evaluate whichever single capture collapse already kept. It
// can't "look back" at a later 200 capture of a URL whose earliest capture
// was a 404. We still send the filter (harmless), but we ALSO filter
// status_code ourselves against whatever CDX actually returns, which is the
// only way to guarantee no non-matching capture slips through. Known,
// accepted limitation: this can't recover a 200 capture of a URL whose
// collapsed representative was already a 404 — that capture was discarded
// by CDX before we ever saw it.
const searchCDX = async (filters) => {
  const cacheKey = `search:${JSON.stringify(filters)}`;
  const cached   = searchCache.get(cacheKey);

  if (cached) {
    return { ...cached, from_cache: true };
  }

  const requestedPageSize = filters.page_size || 25;
  const params = buildCDXParams({ ...filters, page_size: requestedPageSize + 1 });

  const resultsRes = await axios.get(CDX_BASE_URL, {
    params,
    timeout: 15000,
  });

  const rawRows = resultsRes.data;

  // CDX returns [] when nothing matches — handle gracefully
  if (!Array.isArray(rawRows) || rawRows.length <= 1) {
    return {
      results:     [],
      hasNextPage: false,
      currentPage: filters.page || 0,
      from_cache:  false,
    };
  }

  // First row is the header array; rest are result rows
  const headers = rawRows[0];
  let   rows     = rawRows.slice(1);

  // Client-side status_code safety net — see comment above.
  if (filters.status_code) {
    const statusIndex = headers.indexOf('statuscode');
    if (statusIndex !== -1) {
      rows = rows.filter(row => row[statusIndex] === String(filters.status_code));
    }
  }

  // We asked for one extra row — if we got it, there's a next page. Trim
  // back down to the page size the caller actually asked for before mapping.
  // Note: when status_code filtering removed rows above, this "extra row"
  // signal becomes approximate rather than exact, since some of the rows
  // we fetched may have been filtered out client-side. This can under-detect
  // a next page in that case — acceptable tradeoff for correctness over a
  // perfectly precise hasNextPage when a status filter is active.
  const hasNextPage = rows.length > requestedPageSize;
  const trimmedRows = hasNextPage ? rows.slice(0, requestedPageSize) : rows;

  const results = trimmedRows.map(row => formatResult(headers, row));

  const response = {
    results,
    hasNextPage,
    currentPage: filters.page || 0,
    from_cache:  false,
  };

  searchCache.set(cacheKey, response);
  return response;
};

// ─── Format a single CDX row into our result schema ───────────────────────────
const formatResult = (headers, row) => {
  // Build a plain object from the header array and value array
  const raw = {};
  headers.forEach((key, i) => { raw[key] = row[i]; });

  const { timestamp, original, statuscode, mimetype, length } = raw;

  // Wayback replay URL
  const wayback_url = `${WAYBACK_BASE_URL}/${timestamp}/${original}`;

  // Human-readable capture date from the 14-character CDX timestamp (YYYYMMDDHHmmss)
  const y  = timestamp.slice(0, 4);
  const mo = timestamp.slice(4, 6);
  const d  = timestamp.slice(6, 8);
  const h  = timestamp.slice(8, 10);
  const mi = timestamp.slice(10, 12);

  const capture_date          = `${y}-${mo}-${d}`;
  const capture_date_readable = new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  // File size in KB — gracefully handle missing/zero values
  const bytes       = parseInt(length, 10);
  const file_size_kb = bytes && bytes > 0 ? `${Math.round(bytes / 1024)} KB` : null;

  return {
    wayback_url,
    original_url:         original,
    timestamp,
    capture_date,
    capture_date_readable,
    status_code:          statuscode,
    mime_type:            mimetype,
    file_size:            file_size_kb,
    // Thumbnail proxy URL — kept for backward compatibility (the route still
    // exists and works), but the frontend no longer renders this as an
    // <img>. Per instructor guidance, the UI now uses metadata-driven
    // placeholder imagery instead of live screenshots (mshots proved
    // unreliable for archived pages with broken embedded scripts).
    thumbnail_url:        `/api/dig/thumbnail?url=${encodeURIComponent(wayback_url)}`,
    // is_saved is populated by the controller once it knows the current user
    is_saved:             false,
  };
};

// ─── Thumbnail proxy ──────────────────────────────────────────────────────────
// Primary source: WordPress mshots — renders any URL and returns a JPEG.
// Reliable and free, with no API key required.
// Falls back gracefully: controller returns 404, frontend renders placeholder.
// Left in place and functional even though the frontend no longer calls it —
// dormant, not removed, per project decision.
const proxyThumbnail = async (waybackUrl) => {
  const cacheKey = `thumb:${waybackUrl}`;
  const cached   = thumbnailCache.get(cacheKey);
  if (cached) return cached;

  try {
    // mshots renders the page and returns a JPEG screenshot
    const screenshotUrl = `${MSHOTS_BASE_URL}/${encodeURIComponent(waybackUrl)}?w=640&h=480`;

    const response = await axios.get(screenshotUrl, {
      responseType: 'arraybuffer',
      timeout:      12000, // mshots can be slow on first render
      headers: {
        'User-Agent': 'Museum-of-Internet-History/1.0',
      },
    });

    // mshots returns a placeholder GIF while it's rendering. Also require
    // the response to actually BE an image before trusting and forwarding
    // it — some archived pages embed media (e.g. autoplay MP3 players) that
    // mshots' render process can occasionally surface instead of a proper
    // screenshot, which would otherwise get piped straight to the browser.
    const contentType = response.headers['content-type'] || '';
    const isImage      = contentType.startsWith('image/');
    const isPlaceholder =
      contentType.includes('gif') && response.data.byteLength < 5000;

    if (!isImage || isPlaceholder) {
      // Don't cache a non-image or placeholder response — let next request try again
      return null;
    }

    const result = {
      data:        response.data,
      contentType: contentType.split(';')[0].trim(),
    };

    thumbnailCache.set(cacheKey, result);
    return result;
  } catch (error) {
    // Network error, timeout, or 4xx/5xx — return null and let frontend handle
    return null;
  }
};

// ─── Activity timeline ────────────────────────────────────────────────────────
// Returns capture counts grouped by year for a given domain or URL.
// Used by the Random button feature to render the activity bar chart.
// Data comes from CDX directly — no manual research needed.
const getActivityTimeline = async (domain, specificUrl = null) => {
  const urlParam = specificUrl || DOMAIN_PATTERNS[domain];

  const cacheKey = `timeline:${urlParam}`;
  const cached   = searchCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Fetch ALL timestamps for this domain, collapsed by year
    // collapse=timestamp:4 means "one entry per unique YYYY prefix"
    // This gives us one row per year the site was captured — not counts yet.
    // For actual counts we fetch all timestamps and tally client-side.
    // This is efficient because timestamps are tiny (14 chars each).
    const response = await axios.get(CDX_BASE_URL, {
      params: {
        url:       urlParam,
        output:    'json',
        fl:        'timestamp',
        matchType: specificUrl ? 'exact' : 'domain',
        limit:     50000, // safety ceiling
      },
      timeout: 20000,
    });

    const rawRows = response.data;
    if (!Array.isArray(rawRows) || rawRows.length <= 1) return {};

    // Tally captures per year
    const timeline = {};
    rawRows.slice(1).forEach(([timestamp]) => {
      const year = timestamp.slice(0, 4);
      timeline[year] = (timeline[year] || 0) + 1;
    });

    searchCache.set(cacheKey, timeline);
    return timeline;
  } catch {
    return {};
  }
};

// ─── Discover (Random Button) ─────────────────────────────────────────────────
// Supported country codes and their matching data files
const COUNTRY_SITE_FILES = {
  PH: '../data/obscureSitesPH.json',
  JP: '../data/obscureSitesJP.json',
  US: '../data/obscureSitesUS.json',
};

// Load and parse a country's site list — require() caches JSON automatically
const loadSiteList = (country) => {
  const filePath = COUNTRY_SITE_FILES[country];
  if (!filePath) throw new Error(`No site list found for country: ${country}`);
  return require(filePath);
};

// Fisher-Yates shuffle — true random ordering of an array
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Quick CDX ping — checks if a site has ANY captures in a given year.
// Uses limit=1 so it returns immediately on first match.
const pingCDX = async (url, year) => {
  try {
    const response = await axios.get(CDX_BASE_URL, {
      params: {
        url:       url,
        output:    'json',
        fl:        'timestamp',
        from:      `${year}0101`,
        to:        `${year}1231`,
        limit:     1,
        matchType: 'domain',
      },
      timeout: 8000,
    });
    const rows = response.data;
    return Array.isArray(rows) && rows.length > 1;
  } catch {
    return false;
  }
};

// buildCDXParams for discover uses raw_url instead of our domain enum
// buildCDXParams for discover uses raw_url instead of our domain enum
const buildDiscoverCDXParams = (url, year) => ({
  url:       url,
  output:    'json',
  fl:        'timestamp,original,statuscode,mimetype,length',
  matchType: 'domain',
  from:      `${year}0101`,
  to:        `${year}1231`,
  filter:    ['mimetype:text/html', 'statuscode:200'],
  collapse:  'urlkey',
  limit:     25, // Enforce a strict API-level limit instead of pagination
});

// Main discover function
const MAX_ATTEMPTS = 10;

// NOTE on caching: discoverRandom previously cached its response for a
// 5-minute window keyed by year+country. That made sense as a cost-control
// measure (this function does up to MAX_ATTEMPTS sequential CDX pings plus
// a full results fetch — genuinely expensive), but it directly contradicted
// the feature's actual purpose: clicking "Surprise Me" twice in a row with
// the same year/country selected (the default, since neither input resets
// after a successful run) returned the IDENTICAL site both times, which
// looked like the button was broken rather than working as designed.
// Cost control is better handled by the existing dig_uses_today limit,
// which already charges a use per call — that's the real spam deterrent,
// and it doesn't fight the feature's own purpose the way time-bucketed
// caching did. Caching removed entirely for this function.
const discoverRandom = async (year, country = 'PH') => {
  const yearInt  = parseInt(year, 10);
  const siteList = loadSiteList(country.toUpperCase());

  // Pre-filter by active_years — no wasted CDX pings on sites that didnt exist yet
  const eligible = siteList.filter(site => site.active_years.includes(yearInt));

  if (eligible.length === 0) {
    return {
      success:    false,
      message:    `No known sites for ${country} in ${year}. Try a different year.`,
      from_cache: false,
    };
  }

  const shuffled = shuffle(eligible).slice(0, MAX_ATTEMPTS);

  let selectedSite  = null;
  let searchResults = null;

  for (const site of shuffled) {
    const hasCaptures = await pingCDX(site.url, year);
    if (!hasCaptures) continue;

    // Confirmed — fetch full first page of results for this site and year.
    // Discover only ever shows a single page, so we don't need a page count
    // here — drop the second (and unreliable, see searchCDX's comment above)
    // showNumPages request entirely.
    const params = buildDiscoverCDXParams(site.url, year);

    const resultsRes = await axios.get(CDX_BASE_URL, { params, timeout: 15000 });

    const rawRows = resultsRes.data;

    if (!Array.isArray(rawRows) || rawRows.length <= 1) continue;

    const headers = rawRows[0];
    const rows    = rawRows.slice(1);
        
    // Strictly slice the array to a maximum of 25 items for the UI tease
    const results = rows.slice(0, 25).map(row => formatResult(headers, row));

    if (results.length === 0) continue;

    selectedSite  = site;
    searchResults = { results, currentPage: 0, from_cache: false };
    break;
  }

  if (!selectedSite) {
    return {
      success:    false,
      message:    `Could not find archived pages for ${country} sites in ${year}. Try a different year.`,
      from_cache: false,
    };
  }

  // Activity timeline — powers the year bar chart in the UI
  const timeline = await getActivityTimeline(null, selectedSite.url);

  // Peak years — top 3 years by capture count, shown as "Dig Deeper" suggestions
  const peakYears = Object.entries(timeline)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([yr]) => parseInt(yr, 10));

  // Resolve related site objects from their IDs
  const allSites   = loadSiteList(country.toUpperCase());
  const relatedIds = selectedSite.related || [];
  const relatedSites = relatedIds
    .map(id => allSites.find(s => s.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return {
    success:       true,
    site:          selectedSite,
    related_sites: relatedSites,
    results:       searchResults,
    timeline,
    peak_years:    peakYears,
    searched_year: yearInt,
    country,
    from_cache:    false,
  };
};

// Returns the supported countries list for the frontend dropdown
const getSupportedCountries = () => [
  { code: 'PH', label: 'Philippines',  flag: '🇵🇭', available: true  },
  { code: 'JP', label: 'Japan',        flag: '🇯🇵', available: false },
  { code: 'US', label: 'United States', flag: '🇺🇸', available: false },
];

// Re-export with new additions
module.exports = {
  searchCDX,
  proxyThumbnail,
  getActivityTimeline,
  discoverRandom,
  getSupportedCountries,
  DOMAIN_PATTERNS,
};