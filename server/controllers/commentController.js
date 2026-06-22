const Comment = require("../models/Comment");
const Post    = require("../models/Post");

// ─── POST /api/posts/:postId/comments ─────────────────────────────────────────
// Add a comment to a post. Requires auth. Increments the parent post's cached
// comment_count so the feed can display it without a separate count query.
module.exports.createComment = async (req, res, next) => {
	try {
		const { postId } = req.params;
		const { body }    = req.body;

		if (!body || body.trim().length === 0) {
			return res.status(400).send({ message: "Comment body is required" });
		}

		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).send({ message: "Post not found" });
		}

		const newComment = new Comment({
			post_id: post._id,
			author:  req.user._id,
			body:    body.trim()
		});

		const savedComment = await newComment.save();

		post.comment_count += 1;
		await post.save();

		return res.status(201).send({
			message: "Comment added successfully",
			result:  savedComment
		});
	} catch (error) {
		next(error);
	}
};

// ─── GET /api/posts/:postId/comments ──────────────────────────────────────────
// All comments for a post, oldest first (natural reading order).
module.exports.getCommentsForPost = async (req, res, next) => {
	try {
		const { postId } = req.params;

		const comments = await Comment.find({ post_id: postId })
			.sort({ createdAt: 1 })
			.populate("author", "username email role");

		return res.status(200).json({
			success: true,
			data:    comments
		});
	} catch (error) {
		next(error);
	}
};

// ─── DELETE /api/comments/:id ──────────────────────────────────────────────────
// Allowed for three roles:
//   1. The comment's own author
//   2. The author of the post the comment belongs to (moderating their own post)
//   3. An admin (moderating anything)
// Also decrements the parent post's cached comment_count to keep it accurate.
module.exports.deleteComment = async (req, res, next) => {
	try {
		const comment = await Comment.findById(req.params.id);

		if (!comment) {
			return res.status(404).send({ message: "Comment not found" });
		}

		const post = await Post.findById(comment.post_id);

		const isCommentOwner = comment.author.toString() === req.user._id.toString();
		const isPostAuthor   = post && post.author.toString() === req.user._id.toString();
		const isAdmin        = req.user.role === "admin";

		if (!isCommentOwner && !isPostAuthor && !isAdmin) {
			return res.status(403).send({ message: "You are not allowed to delete this comment" });
		}

		await comment.deleteOne();

		// Guard against a missing/already-deleted post — don't let that block the
		// comment deletion itself, just skip the counter sync.
		if (post) {
			post.comment_count = Math.max(0, post.comment_count - 1);
			await post.save();
		}

		return res.status(200).send({ message: "Comment deleted successfully" });
	} catch (error) {
		next(error);
	}
};

// ─── GET /api/comments ────────────────────────────────────────────────────────
// Fetch all comments globally. Should be restricted to Admins only.
module.exports.getAllComments = async (req, res, next) => {
	try {
		// Ensure only admins can access this route
		if (req.user.role !== "admin") {
			return res.status(403).send({ message: "Admin access required" });
		}

		const page     = parseInt(req.query.page, 10)  || 0;
		const pageSize = parseInt(req.query.limit, 10) || 20;

		// Fetch comments, newest first, and populate related data
		const comments = await Comment.find({})
			.sort({ createdAt: -1 })
			.skip(page * pageSize)
			.limit(pageSize)
			.populate("author", "username email")
			.populate("post_id", "title body"); // Helps admins see which post the comment belongs to

		const total = await Comment.countDocuments({});

		return res.status(200).json({
			success: true,
			data:    comments,
			page,
			pageSize,
			total
		});
	} catch (error) {
		next(error);
	}
};