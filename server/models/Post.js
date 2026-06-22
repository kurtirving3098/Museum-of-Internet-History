const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "Author is required"]
	},

	title: {
		type: String,
		required: [true, "Title is required"],
		trim: true,
		maxlength: [150, "Title cannot exceed 150 characters"]
	},

	body: {
		type: String,
		required: [true, "Body is required"],
		trim: true
	},

	// Cached count — avoids a countDocuments() query every time the feed renders.
	// Kept in sync by CommentController on create/delete.
	comment_count: {
		type: Number,
		default: 0,
		min: 0
	}

}, {timestamps: true});

// Feed is sorted newest-first — index supports that query directly
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);