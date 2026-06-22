const Post    = require("../models/Post");
const Comment = require("../models/Comment");

// ─── POST /api/posts ──────────────────────────────────────────────────────────
// Create a new post on the feed. Requires auth.
module.exports.createPost = async (req, res, next) => {
	try {
		const { title, body } = req.body;

		if (!title || title.trim().length === 0) {
			return res.status(400).send({ message: "Title is required" });
		}
		if (!body || body.trim().length === 0) {
			return res.status(400).send({ message: "Body is required" });
		}

		const newPost = new Post({
			author: req.user._id,
			title:  title.trim(),
			body:   body.trim()
		});

		const savedPost = await newPost.save();

		return res.status(201).send({
			message: "Post created successfully",
			result:  savedPost
		});
	} catch (error) {
		next(error);
	}
};

// ─── GET /api/posts ───────────────────────────────────────────────────────────
// Feed listing — newest first. Populates author so the frontend doesn't need a
// second round trip to show who wrote each post.
// ─── GET /api/posts ───────────────────────────────────────────────────────────
module.exports.getFeed = async (req, res, next) => {
	try {
		const page     = parseInt(req.query.page, 10)  || 0;
		const pageSize = parseInt(req.query.limit, 10) || 20;
		const authorId = req.query.author; // <-- Add this

		// Build the query object
		const query = {};
		if (authorId) {
			query.author = authorId;
		}

		// Pass the query object into find() and countDocuments()
		const posts = await Post.find(query)
			.sort({ createdAt: -1 })
			.skip(page * pageSize)
			.limit(pageSize)
			.populate("author", "username email role");

		const total = await Post.countDocuments(query);

		return res.status(200).json({
			success: true,
			data:    posts,
			page,
			pageSize,
			total
		});
	} catch (error) {
		next(error);
	}
};

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────
// Single post detail. Frontend fetches comments separately via CommentController.
module.exports.getPostById = async (req, res, next) => {
	try {
		const post = await Post.findById(req.params.id)
			.populate("author", "username email role");

		if (!post) {
			return res.status(404).send({ message: "Post not found" });
		}

		return res.status(200).json({
			success: true,
			data:    post
		});
	} catch (error) {
		next(error);
	}
};

// ─── PATCH /api/posts/:id ────────────────────────────────────────────────────
// Edit a post. Allowed for: the post's own author, OR an admin.
module.exports.editPost = async (req, res, next) => {
	try {
		const { title, body } = req.body;
		const post = await Post.findById(req.params.id);

		if (!post) {
			return res.status(404).send({ message: "Post not found" });
		}

		// Check permissions: Owner or Admin
		const isOwner = post.author.toString() === req.user._id.toString();
		const isAdmin = req.user.role === "admin";

		if (!isOwner && !isAdmin) {
			return res.status(403).send({ message: "You are not allowed to edit this post" });
		}

		// Update fields if provided
		if (title && title.trim().length > 0) post.title = title.trim();
		if (body && body.trim().length > 0) post.body = body.trim();

		const updatedPost = await post.save();

		return res.status(200).send({
			message: "Post updated successfully",
			result:  updatedPost
		});
	} catch (error) {
		next(error);
	}
};

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
// Allowed for: the post's own author, OR an admin.
// Deleting a post also cascades to its comments so the Comment collection
// doesn't accumulate orphaned rows pointing at a deleted post.
module.exports.deletePost = async (req, res, next) => {
	try {
		const post = await Post.findById(req.params.id);

		if (!post) {
			return res.status(404).send({ message: "Post not found" });
		}

		const isOwner = post.author.toString() === req.user._id.toString();
		const isAdmin = req.user.role === "admin";

		if (!isOwner && !isAdmin) {
			return res.status(403).send({ message: "You are not allowed to delete this post" });
		}

		await Comment.deleteMany({ post_id: post._id });
		await post.deleteOne();

		return res.status(200).send({ message: "Post deleted successfully" });
	} catch (error) {
		next(error);
	}
};