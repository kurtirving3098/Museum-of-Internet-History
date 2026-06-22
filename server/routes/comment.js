// routes/commentRoutes.js (or whatever this file is named)
const express = require("express");
const router  = express.Router({ mergeParams: true }); 

const {	createComment, getCommentsForPost, deleteComment } = require("../controllers/commentController");

const { verify } = require("../auth");

router.post("/",verify, createComment);       
router.get("/", getCommentsForPost); 
router.delete("/:id", verify, deleteComment);

module.exports = router;