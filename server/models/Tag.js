const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema({
	domain: {
		type: String,
		required: [true, "Domain is required"],
		enum: ["friendster", "pinoyexchange"]
	},

	label: {
		type: String,
		required: [true, "Label is required"],
		trim: true
	},

	// Consumed by the Digging Tool / search conversation to pre-fill or suggest
	// CDX url_keyword filters. We just store and expose it here.
	cdx_pattern: {
		type: String,
		default: null
	}

}, { timestamps: true });

tagSchema.index({ domain: 1 });

module.exports = mongoose.model("Tag", tagSchema);