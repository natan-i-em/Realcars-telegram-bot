process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application continues running instead of crashing
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});



require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const startBot = require("./bot");

const app = express();

/* -----------------------
   Middleware
----------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -----------------------
   Connect Database
----------------------- */

connectDB();

/* -----------------------
   Start Telegram Bot
----------------------- */

startBot();

/* -----------------------
   Routes (optional API)
----------------------- */

app.get("/", (req, res) => {
  res.send("🚗 Car Bot Backend Running");
});

/* -----------------------
   Server
----------------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});