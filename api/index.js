// api/index.js or server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { sequelize,syncDB } = require("./models"); // Sequelize setup

// Import routes
const questionRoutes = require("./routes/questions");
const userRoutes = require("./routes/users");
const answerRoutes = require("./routes/answers");
const voteRoutes = require("./routes/votes");
const skillRoutes = require("./routes/skills");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/skills", skillRoutes);

app.get("/", (req, res) => {
  res.send("✅ API is live on Vercel!");
});

// Connect to database and start server
sequelize.authenticate()
  .then(() => {
    console.log("✅ Connected to Supabase PostgreSQL");

   return syncDB(); // optional: auto sync models
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error connecting to database:", err);
  });

