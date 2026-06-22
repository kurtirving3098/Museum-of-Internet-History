const mongoose = require("mongoose");

const savedItemSchema = new mongoose.Schema({
	user_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "User reference is required"]
	},

	source_type: {
		type: String,
		enum: ["exhibit", "wayback_capture"],
		required: [true, "Source type is required"]
	},

	// Only populated when source_type is "exhibit". A raw wayback_capture save
	// has no curated Artifact behind it (that's the whole point — it's something
	// the user found themselves and hasn't submitted for curation).
	artifact_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Artifact",
		default: null
	},

	// Required for wayback_capture saves so the dashboard can link back to the
	// original capture. Optional/redundant for exhibit saves since artifact_id
	// already resolves it, but harmless to store either way.
	wayback_url: {
		type: String,
		default: null
	},

	// Snapshotted at save time — the dashboard must render even if Wayback
	// or our thumbnail proxy is down later.
	thumbnail_url: {
		type: String,
		required: [true, "Thumbnail URL is required"]
	},

	// Denormalized display fields so the saved-items dashboard doesn't need to
	// re-fetch or re-resolve an Exhibit/Artifact on every load
	name: {
		type: String,
		default: null
	},

	personal_note: {
		type: String,
		default: null
	}

}, { timestamps: true });

// A user's dashboard query is always "give me everything this user saved,
// newest first"
savedItemSchema.index({ user_id: 1, createdAt: -1 });

// Prevents the same user from saving the exact same exhibit twice.
// Sparse so it doesn't choke on wayback_capture saves where artifact_id is null.
savedItemSchema.index(
	{ user_id: 1, artifact_id: 1 },
	{ unique: true, sparse: true }
);

module.exports = mongoose.model("SavedItem", savedItemSchema);