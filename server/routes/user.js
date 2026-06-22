const express        = require("express");
const router         = express.Router();
const userController = require("../controllers/userController");
const { verify } = require("../auth");

// POST /api/users/register
router.post("/register", userController.registerUser);

// POST /api/users/login
router.post("/login", userController.loginUser);

// GET /api/users/me
router.get("/me", verify, userController.getMe);

module.exports = router;