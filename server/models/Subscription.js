const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null
	}, 

	status: {
		type: String,
		default: "active",
		enum: ["active", "cancelled", "expired"]
	},

	plan: {
		type: String,
		enum: ["monthly", "yearly"],
		default: "monthly"
	},

	start_date: {
		type: Date,
		default: Date.now,
	}, 

	end_date: {
		type: Date,
		default: null
	}

}, {timestamps: true});

module.exports = mongoose.model("Subscription", subscriptionSchema);