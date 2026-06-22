const jwt = require("jsonwebtoken");
const User = require("./models/User");

require("dotenv").config();

// ─── Create JWT ───────────────────────────────────────────────────────────────
module.exports.createAccessToken = (user) => {
	const data = {
		id:      user._id,
		email:   user.email,
		isAdmin: user.role === "admin",
		tier:    user.tier
	};

	return jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });
};

// ─── Verify JWT and attach full user from DB ──────────────────────────────────
// Fetches the full user document so controllers have access to live usage counters
module.exports.verify = async (req, res, next) => {
	let token = req.headers.authorization;

	if (typeof token === "undefined") {
		return res.status(401).send({ auth: "Failed. No Token." });
	}

	token = token.slice(7);

	try {
		const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

		// Pull fresh user from DB — counters on the token would be stale
		const user = await User.findById(decodedToken.id).select("-password_hash");

		if (!user) {
			return res.status(401).send({ auth: "Failed", message: "User not found." });
		}

		req.user = user;
		next();
	} catch (err) {
		return res.status(403).send({ auth: "Failed", message: err.message });
	}
};

// ─── Admin only — run after verify ───────────────────────────────────────────
module.exports.verifyAdmin = (req, res, next) => {
	if (req.user && req.user.role === "admin") {
		next();
	} else {
		return res.status(403).send({ auth: "Failed", message: "Action Forbidden" });
	}
};

// ─── Reset daily usage counters when the calendar date rolls over ─────────────
// Attach after verify so req.user is always available
module.exports.resetUsage = async (req, res, next) => {
	try {
		const todayMidnight = new Date();
		todayMidnight.setHours(0, 0, 0, 0);

		const lastReset = new Date(req.user.uses_reset_date);
		lastReset.setHours(0, 0, 0, 0);

		if (lastReset < todayMidnight) {
			await User.findByIdAndUpdate(req.user._id, {
				dig_uses_today:        0,
				submission_uses_today: 0,
				uses_reset_date:       new Date()
			});

			// Keep in-memory object in sync so this request sees fresh counters
			req.user.dig_uses_today        = 0;
			req.user.submission_uses_today = 0;
			req.user.uses_reset_date       = new Date();
		}

		next();
	} catch (err) {
		// Non-fatal — log and continue
		console.error("resetUsage error:", err.message);
		next();
	}
};

// ─── Global error handler ─────────────────────────────────────────────────────
module.exports.errorHandler = (err, req, res, next) => {
	console.error(err);

	const statusCode   = err.status || 500;
	const errorMessage = err.message || "Internal Server Error";

	res.status(statusCode).json({
		error: {
			message:   errorMessage,
			errorCode: err.code || "Server Error",
			details:   err.details || null
		}
	});
};