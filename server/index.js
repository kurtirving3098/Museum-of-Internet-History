const dotenv = require("dotenv");
dotenv.config();
const express  = require("express");
const mongoose = require("mongoose");

// ─── ROUTE IMPORTS ────────────────────────────────────────────────────────────
const digRoutes  = require("./routes/dig");
const userRoutes = require("./routes/user");
const postRoutes    = require("./routes/post");       
const commentRoutes = require("./routes/comment");    
const tagRoutes      = require("./routes/tag");
const exhibitRoutes  = require("./routes/exhibit");
const savedRoutes    = require("./routes/saved");
const artifactRoutes = require("./routes/artifact");
const subscriptionRoutes = require("./routes/subscription");
const adminRoutes    = require("./routes/admin");

// ─── CONTROLLER IMPORTS FOR GLOBAL ROUTES ─────────────────────────────────────
const { getAllComments } = require("./controllers/commentController"); // NEW

// ─── AUTH / MIDDLEWARE IMPORTS ────────────────────────────────────────────────
const { errorHandler, verify, verifyAdmin } = require("./auth"); // UPDATED to include verifyAdmin

const cors = require("cors");
const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:4000"
    ],
    credentials:         true,
    optionsSuccessStatus: 200
};

// ─── APP INITIALIZATION ───────────────────────────────────────────────────────
const app = express();
app.use(cors(corsOptions));

// ─── DATABASE CONNECTION ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_STRING);
let db = mongoose.connection;
db.on("error",  (err) => console.error("Connection error:", err));
db.once("open", ()    => console.log("Now connected to MongoDB Atlas."));

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/dig",   digRoutes);
app.use("/api/posts", postRoutes);                          
app.use("/api/posts/:postId/comments", commentRoutes);      
app.use("/api/tags",     tagRoutes);
app.use("/api/exhibits", exhibitRoutes);
app.use("/api/saved",    savedRoutes);
app.use("/api/artifacts", artifactRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin",    adminRoutes);

// Global Admin Dashboard Route (NEW)
app.get("/api/comments", verify, verifyAdmin, getAllComments);


// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success:   true,
        message:   "Museum of Internet History API is running.",
        timestamp: new Date().toISOString()
    });
});

// ─── GLOBAL ERROR HANDLER — must be last ─────────────────────────────────────
app.use(errorHandler);

// ─── SERVER START ─────────────────────────────────────────────────────────────
if (require.main === module) {
    app.listen(process.env.PORT, () =>
        console.log(`Server running at port ${process.env.PORT}`)
    );
}

module.exports = { app, mongoose };