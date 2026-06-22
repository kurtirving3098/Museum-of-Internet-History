const mongoose = require("mongoose");

const exhibitSchema = new mongoose.Schema({
	artifact_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Artifact",
		required: [true, "Artifact reference is required"]
	},

	// Permanent sequential ID assigned at creation time (approval pipeline).
	// Used for stable public-facing references — never reassigned.
	exhibit_number: {
		type: Number,
		required: [true, "Exhibit number is required"],
		unique: true
	},

	// Adjustable sort key for gallery ordering — independent of exhibit_number
	// so admins can reorder the gallery without renumbering exhibits.
	display_order: {
		type: Number,
		default: 0
	},

	featured: {
		type: Boolean,
		default: false
	},

	// Copied from Artifact.flag_count at approval time, but can keep accruing
	// independently if flagging continues post-approval (e.g. broken link reports).
	flag_count: {
		type: Number,
		default: 0,
		min: 0
	},

	// ── Display fields — set at approval time ─────────────────────────────────
	// name/description start as the submitter's originals but are editable by
	// the admin during review (see AdminController.approveArtifact).
	era: {
		type: String,
		default: null
	},

	name: {
		type: String,
		required: [true, "Name is required"]
	},

	description: {
		type: String,
		required: [true, "Description is required"]
	},

	// The Wayback Machine URL for the archived capture this exhibit is based on.
	// Auto-populated from the source Artifact's wayback_url at approval time,
	// admin-editable afterward. Displayed on the public ExhibitDetail page so
	// visitors can open the actual archived page.
	wayback_url: {
		type: String,
		default: null
	},

	tags: {
		type: [String],
		default: []
	},

	// Cloudinary-hosted thumbnail. There is no automated capture path — an
	// admin manually screenshots the Wayback page themselves during review
	// and uploads it as part of the approve action. Optional: an Exhibit can
	// exist with no thumbnail if the admin approves without uploading one;
	// the gallery renders a placeholder card for those.
	thumbnail: {
		type: String,
		default: null
	},

	// Cloudinary public_id for the uploaded thumbnail — required to delete or
	// replace the asset later (re-upload to overwrite). Not derivable from
	// the URL alone, so it must be stored separately.
	thumbnail_public_id: {
		type: String,
		default: null
	},

	// Snapshotted display credit, resolved once at approval time from
	// Artifact.submitter_tier_at_submission. "Community" for free-tier
	// submitters, the submitter's username for paid-tier submitters. Stored
	// as a plain string rather than a live ref so it survives the submitting
	// user's account being deleted or changing tier after the fact.
	credited_to: {
		type: String,
		default: "Community"
	},

	// Soft-delete flag. Hidden exhibits are removed from the public gallery
	// but preserved for audit purposes (exhibit_number is permanent).
	// One-way — no unhide route. See AdminController.hideExhibit.
	hidden: {
		type: Boolean,
		default: false
	}

}, { timestamps: true });

exhibitSchema.index({ display_order: 1 });
exhibitSchema.index({ featured: 1 });
exhibitSchema.index({ hidden: 1 });

module.exports = mongoose.model("Exhibit", exhibitSchema);