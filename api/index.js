const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { sequelize } = require("./models");
const serverless = require("serverless-http"); // 👈 add this

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/questions", require("./routes/questions"));
app.use("/api/answers", require("./routes/answers"));
app.use("/api/votes", require("./routes/votes"));
app.use("/api/skills", require("./routes/skills"));

app.get("/", (req, res) => {
  res.send("✅ API is live on Vercel!");
});

// DB connection (don’t block exports)
sequelize
  .authenticate()
  .then(() => console.log("✅ Connected to Supabase PostgreSQL"))
  .catch((err) => console.error("❌ DB connection failed:", err));

// ❌ REMOVE app.listen()
// ✅ Instead export as serverless handler
module.exports = serverless(app);
