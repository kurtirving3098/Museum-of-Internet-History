const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── Limits by tier ───────────────────────────────────────────────────────────
const TIER_LIMITS = {
  free: { digs: 5,        submissions: 1,   saves: 10 },
  paid: { digs: Infinity, submissions: 5,   saves: Infinity },
};

const UserSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'userame is required'],
      trim:      true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password_hash: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false, // never returned in queries by default
    },
    tier: {
      type:    String,
      enum:    ['free', 'paid'],
      default: 'free',
    },
    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },

    // ── Daily usage counters (reset by resetUsage middleware) ─────────────────
    dig_uses_today: {
      type:    Number,
      default: 0,
      min:     0,
    },
    submission_uses_today: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Cached save count (avoids expensive countDocuments on every save check)
    saves_count: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Date the daily counters were last reset ────────────────────────────────
    uses_reset_date: {
      type:    Date,
      default: Date.now,
    },

    avatar: {
      type:    String,
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Hash password before saving ──────────────────────────────────────────────
UserSchema.pre('save', async function () {
  if (!this.isModified('password_hash')) return;
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// ─── Instance methods ──────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password_hash);
};

// Can this user dig right now?
UserSchema.methods.canDig = function () {
  const limit = TIER_LIMITS[this.tier].digs;
  return limit === Infinity || this.dig_uses_today < limit;
};

// Can this user submit right now?
UserSchema.methods.canSubmit = function () {
  const limit = TIER_LIMITS[this.tier].submissions;
  return limit === Infinity || this.submission_uses_today < limit;
};

// Can this user save more artifacts?
UserSchema.methods.canSave = function () {
  const limit = TIER_LIMITS[this.tier].saves;
  return limit === Infinity || this.saves_count < limit;
};

// ─── Virtuals ─────────────────────────────────────────────────────────────────
UserSchema.virtual('dig_remaining').get(function () {
  const limit = TIER_LIMITS[this.tier].digs;
  return limit === Infinity ? null : Math.max(0, limit - this.dig_uses_today);
});

UserSchema.virtual('dig_limit').get(function () {
  const limit = TIER_LIMITS[this.tier].digs;
  return limit === Infinity ? null : limit;
});

// Export limits so controllers can reference them without re-defining
UserSchema.statics.TIER_LIMITS = TIER_LIMITS;

module.exports = mongoose.model('User', UserSchema);