const User = require("../models/User");
const { errorHandler, createAccessToken } = require("../auth");
const bcrypt = require("bcryptjs");

// ─── REGISTER ─────────────────────────────────────────────────────────────────
module.exports.registerUser = async (req, res) => {
	const { username, email, password } = req.body;

	try {
		// ── Validation ──────────────────────────────────────────────────────────
		if (!username || username.trim().length === 0) {
			return res.status(400).send({ message: "Username is required" });
		}
		if (!email || !email.includes("@")) {
			return res.status(400).send({ message: "Incorrect email format" });
		}
		if (!password || password.length < 8) {
			return res.status(400).send({ message: "Password must be at least 8 characters" });
		}

		// ── Check for existing user ──────────────────────────────────────────────
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(409).send({ message: "Email already registered" });
		}

		// ── Create user ──────────────────────────────────────────────────────────
		// Note: password_hash is the field name in our schema.
		// The pre-save hook in User.js automatically bcrypts it before saving —
		// we do NOT hash it manually here.
		const newUser = new User({
			username:          username.trim(),
			email:         email.toLowerCase().trim(),
			password_hash: password,
			tier:          "free",
			role:          "user"
		});

		const savedUser = await newUser.save();

		// Strip password_hash from the response
		const userResponse = savedUser.toObject();
		delete userResponse.password_hash;

		return res.status(201).send({
			message: "Registered Successfully",
			result:  userResponse
		});

	} catch (err) {
		errorHandler(err, req, res);
	}
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
module.exports.loginUser = async (req, res) => {
	const { email, password } = req.body;

	try {
		// ── Validation ──────────────────────────────────────────────────────────
		if (!email || !email.includes("@")) {
			return res.status(400).send({ message: "Invalid email format" });
		}
		if (!password) {
			return res.status(400).send({ message: "Password is required" });
		}

		// ── Find user — explicitly select password_hash since it's hidden by default
		const user = await User.findOne({ email }).select("+password_hash");

		if (!user) {
			return res.status(404).send({ message: "Email not found" });
		}

		// ── Compare password using the instance method on our User model ──────────
		const isPasswordCorrect = await user.comparePassword(password);

		if (!isPasswordCorrect) {
			return res.status(401).send({ message: "Incorrect email or password" });
		}

		return res.status(200).send({
			message: "User logged in successfully",
			access:  createAccessToken(user)
		});

	} catch (err) {
		errorHandler(err, req, res);
	}
};

// ─── GET /api/users/me ────────────────────────────────────────────────────────
// Auth-protected. `verify` middleware already fetched the full user doc
// (minus password_hash) and attached it as req.user, so this just returns it.
module.exports.getMe = async (req, res) => {
	return res.status(200).send({
		message: "User profile retrieved",
		result:  req.user
	});
};