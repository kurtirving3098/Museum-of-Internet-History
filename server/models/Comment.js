const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
	post_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Post",
		required: [true, "Post is required"]
	},

	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "Author is required"]
	},

	body: {
		type: String,
		required: [true, "Body is required"],
		trim: true,
		maxlength: [2000, "Comment cannot exceed 2000 characters"]
	}

}, {timestamps: true});

// Fetching all comments for a post, oldest-first, is the main query pattern
commentSchema.index({ post_id: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", commentSchema);