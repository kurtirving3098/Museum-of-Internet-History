require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// ─── Config ───────────────────────────────────────────────────────────────────
// Expects CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// in .env. cloudinary.config() reads these automatically if named
// CLOUDINARY_URL, but we set explicitly here so any of the three vars being
// misnamed fails loudly at startup rather than silently no-op-ing uploads.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOAD_FOLDER = "museum-of-internet-history/exhibits";

// ─── Upload a thumbnail buffer to Cloudinary ───────────────────────────────────
// Takes a raw image buffer (from multer's memory storage — see
// adminController.js) and uploads it via Cloudinary's upload_stream, since
// the SDK's simpler `upload()` method expects a file path or remote URL, not
// an in-memory buffer. Returns { secure_url, public_id } on success.
const uploadThumbnail = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:          UPLOAD_FOLDER,
        resource_type:   "image",
        // Admin-sourced screenshots vary wildly in size/aspect ratio (full
        // page captures, cropped regions, different monitors) — constrain
        // to a consistent gallery-card thumbnail size rather than storing
        // and serving whatever raw dimensions the admin's screenshot tool
        // produced.
        transformation: [
          { width: 640, height: 480, crop: "fill", gravity: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          secure_url: result.secure_url,
          public_id:  result.public_id,
        });
      }
    );

    uploadStream.end(buffer);

    console.log('Cloudinary config check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'MISSING',
  api_key:    process.env.CLOUDINARY_API_KEY ? 'set' : 'MISSING',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'MISSING',
});
  });
};

// ─── Delete a previously-uploaded thumbnail ────────────────────────────────────
// Used when an admin replaces an existing Exhibit thumbnail with a new
// upload — cleans up the orphaned old asset instead of leaving it to
// accumulate in the Cloudinary account indefinitely.
const deleteThumbnail = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Non-fatal — a failed cleanup of the OLD asset shouldn't block whatever
    // operation triggered the replacement. Log and move on.
    console.error("Cloudinary delete failed:", error.message);
  }
};

module.exports = { uploadThumbnail, deleteThumbnail };