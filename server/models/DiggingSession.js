const mongoose = require('mongoose');

const DiggingSessionSchema = new mongoose.Schema(
  {
    user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // What the user searched for
    query: {
      type:     String,
      required: true,
      trim:     true,
    },

    // Domain dug into this session. Was previously locked to a fixed enum
    // (friendster, pinoyexchange) back when search only supported those two
    // presets. Search now accepts any freeform domain the user types, so
    // this just needs to be a plain string — the index below still makes
    // per-domain analytics queries efficient either way.
    domain: {
      type:     String,
      required: true,
      trim:     true,
    },

    // All filter options used in this session
    filters: {
      date_from:    { type: String, default: null },
      date_to:      { type: String, default: null },
      mime_type:    { type: String, default: null },
      status_code:  { type: String, default: null },
      url_keyword:  { type: String, default: null },
      match_type:   { type: String, default: null },
      collapse:     { type: Boolean, default: true },
      page:         { type: Number, default: 0 },
    },

    results_count: {
      type:    Number,
      default: 0,
    },

    // search = advanced search | random = random button
    session_type: {
      type:    String,
      enum:    ['search', 'random'],
      default: 'search',
    },

    // Was this result served from cache?
    from_cache: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for analytics and admin queries
DiggingSessionSchema.index({ user_id: 1, createdAt: -1 });
DiggingSessionSchema.index({ createdAt: -1 });
DiggingSessionSchema.index({ domain: 1 });

module.exports = mongoose.model('DiggingSession', DiggingSessionSchema);