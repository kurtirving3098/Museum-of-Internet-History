const mongoose = require("mongoose");

const artifactSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null
	}, 

	wayback_url: {
		type: String,
		required: [true, "Wayback URL is required"],
		default: null
	},

	original_url: {
		type: String,
		required: [true, "Original URL is required"],
		default: null
	},

	capture_timestamp: {
		type: Date,
		default: Date.now
	},

	domain: {
		type: String,
		default: null
	},

	name: {
		type: String,
		required: [true, "Name is required"]
	},

	description: {
		type: String,
		required: [true, "Artifact Description is required"]
	},

	curation_reason: {
		type: String,
		required: [true, "Curation Reason is required"]
	},

	already_curated: {
		type: Boolean,
		default: false
	},

	// Thumbnails are no longer captured automatically at submission time —
	// live screenshot rendering of Wayback replay pages (mshots) proved
	// unreliable, so the frontend no longer attempts it. A thumbnail only
	// exists once an admin manually screenshots the page themselves and
	// uploads it during curation (see Exhibit.thumbnail). Optional here —
	// a submission can and usually will arrive with no thumbnail at all.
	thumbnail_url: {
		type: String,
		default: null
	},

	status: {
		type: String,
		default: "pending",
		enum: ["pending", "approved", "rejected", "featured"]
	},

	// Incremented whenever a user flags this wayback_url as already-submitted.
	// Drives admin queue sort order — higher flag_count surfaces likely-duplicate
	// or high-interest submissions first.
	flag_count: {
		type: Number,
		default: 0,
		min: 0
	},

	// Snapshot of the submitting user's tier AT THE MOMENT they submitted —
	// never re-derived later. Drives the Exhibit's "credited_to" display:
	// paid submitters get their username credited, free submitters are
	// credited as "Community". Using a live lookup at approval time would
	// give the wrong answer if the user's tier changed between submission
	// and review (upgraded, downgraded, or cancelled in the interim).
	submitter_tier_at_submission: {
		type: String,
		enum: ["free", "paid"],
		default: "free"
	},

	reviewer_note: {
		type: String,
		default: null
	},

	reviewed_by: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null
	},

	reviewed_at: {
		type: Date
	},

	submitted_at: {
		type: Date,
		default: Date.now
	}

}, {timestamps: true});

module.exports = mongoose.model("Artifact", artifactSchema);