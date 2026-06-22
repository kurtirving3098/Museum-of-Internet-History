const express = require("express");
const router  = express.Router();

const {	createPost,	getFeed, getPostById,deletePost } = require("../controllers/postController");

const { verify } = require("../auth");

// ─── /api/posts ────────────────────────────────────────────────────────────────
router.post("/", verify, createPost);   // create a post
router.get("/", getFeed);      // public feed listing
router.get("/:id", getPostById); // public single-post view
router.delete("/:id", verify, deletePost);  // owner-or-admin check lives in controller

module.exports = router;